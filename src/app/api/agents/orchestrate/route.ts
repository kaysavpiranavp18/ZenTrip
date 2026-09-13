import { NextRequest, NextResponse } from 'next/server';
import { generateTrip } from '@/lib/agents';
import { tripPreferencesSchema } from '@/lib/validations';
import { saveTrip } from '@/lib/db/trips';
import { getUserFromRequest } from '@/lib/serverAuth';
import type { AgentStatus, Trip } from '@/types';

// ─── SSE helpers ──────────────────────────────────────────────────────────────

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ─── Persistence helper ───────────────────────────────────────────────────────
// Persist the generated trip server-side. A persistence failure must never
// fail the orchestration — the trip is still returned to the client.

async function persistGeneratedTrip(
  trip: Trip,
  userId?: string | null
): Promise<{ trip: Trip; persisted: boolean }> {
  try {
    const saveResult = await saveTrip(trip, userId || undefined);
    if (saveResult.error || !saveResult.data) {
      console.warn('[Orchestrate] Trip persistence failed:', saveResult.error);
      return { trip, persisted: false };
    }
    return { trip: saveResult.data, persisted: true };
  } catch (err) {
    console.warn('[Orchestrate] Trip persistence threw:', err instanceof Error ? err.message : err);
    return { trip, persisted: false };
  }
}

// ─── Streaming POST ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.preferences) {
    return NextResponse.json({ success: false, error: 'Preferences are required' }, { status: 400 });
  }

  const parseResult = tripPreferencesSchema.safeParse(body.preferences);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid preferences',
        details: parseResult.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
      { status: 400 }
    );
  }

  // Resolve the owning user (Supabase auth token first, explicit body userId as fallback)
  const user = await getUserFromRequest(request);
  const bodyUserId = typeof body.userId === 'string' ? body.userId : null;
  const userId = user?.id || bodyUserId || null;

  // Check if caller wants SSE streaming
  const wantsStream = request.headers.get('accept') === 'text/event-stream';

  if (!wantsStream) {
    // Legacy non-streaming path
    try {
      const generated = await generateTrip(parseResult.data);
      const { trip, persisted } = await persistGeneratedTrip(generated, userId);
      return NextResponse.json({
        success: true,
        data: { trip, agents: trip.agents, confidence: trip.confidenceScore, warnings: trip.warnings, persisted },
      });
    } catch {
      return NextResponse.json({ success: false, error: 'Orchestration failed' }, { status: 500 });
    }
  }

  // ── SSE Streaming path ──────────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      };

      try {
        send('status', { message: 'Your AI travel team is assembling...', progress: 0 });

        const generated = await generateTrip(
          parseResult.data,
          (agentId: string, status: AgentStatus, progress: number, output?: string) => {
            send('agent', { agentId, status, progress, output: output ?? null });
            // Derive overall progress (10 agents)
            if (status === 'completed') {
              send('status', { message: output ?? `${agentId} completed`, progress });
            }
          }
        );

        // Persist before announcing the trip so the client receives a durable id
        const { trip, persisted } = await persistGeneratedTrip(generated, userId);

        send('trip', { trip });
        send('done', { success: true, persisted });
      } catch (err) {
        send('error', { message: err instanceof Error ? err.message : 'Orchestration failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
