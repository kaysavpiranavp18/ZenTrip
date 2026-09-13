import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTripById, patchTripById } from '@/lib/db/trips';
import { mergeGroupPreferences, saveCompanionsWithVotes } from '@/lib/db/extras';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const groupVoteSchema = z.object({
  userId: z.string().optional(),
  applyToTrip: z.boolean().default(true),
  companions: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      preferences: z.record(z.string(), z.unknown()).optional(),
      votes: z.record(z.string(), z.string()).optional(),
    })
  ).min(1, 'At least one companion vote is required'),
});

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = groupVoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid group vote payload',
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { userId, companions, applyToTrip } = parsed.data;

    const tripResult = await getTripById(id, userId);
    if (tripResult.error || !tripResult.data) {
      return NextResponse.json({ success: false, error: tripResult.error || 'Trip not found' }, { status: 404 });
    }

    const mergedPreferences = mergeGroupPreferences(tripResult.data.preferences, companions);

    const saveCompanions = await saveCompanionsWithVotes(id, companions);
    if (saveCompanions.error) {
      return NextResponse.json({ success: false, error: saveCompanions.error }, { status: 500 });
    }

    if (applyToTrip) {
      const patch = await patchTripById(id, { preferences: mergedPreferences, travelers: mergedPreferences.travelers }, userId);
      if (patch.error) {
        return NextResponse.json({ success: false, error: patch.error }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        tripId: id,
        mergedPreferences,
        votesCount: companions.length,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to process group vote' }, { status: 500 });
  }
}
