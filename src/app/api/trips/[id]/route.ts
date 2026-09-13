import { NextRequest, NextResponse } from 'next/server';
import { deleteTripById, getTripById, patchTripById, saveTrip } from '@/lib/db/trips';
import { tripPreferencesSchema } from '@/lib/validations';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const result = await getTripById(id, userId);
    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch trip' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const { userId, ...updates } = body;

    if (updates.preferences) {
      const validation = tripPreferencesSchema.partial().safeParse(updates.preferences);
      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid preferences patch',
            details: validation.error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          },
          { status: 400 }
        );
      }
    }

    const result = await patchTripById(id, updates, userId || undefined);
    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update trip' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);

    // userId can arrive as a query param or an optional JSON body
    let bodyUserId: string | null = null;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => null);
      if (body && typeof body.userId === 'string') bodyUserId = body.userId;
    }

    const result = await deleteTripById(id, searchParams.get('userId') || bodyUserId);
    if (result.error) {
      const status = result.error === 'Trip not found' ? 404 : 500;
      return NextResponse.json({ success: false, error: result.error }, { status });
    }

    return NextResponse.json({ success: true, data: { deleted: true, id } });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete trip' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { userId, trip } = body;

    if (!trip) {
      return NextResponse.json({ success: false, error: 'Trip object is required' }, { status: 400 });
    }

    const result = await saveTrip(trip, userId || null);
    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to save trip' }, { status: 500 });
  }
}
