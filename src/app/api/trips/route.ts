import { NextRequest, NextResponse } from 'next/server';
import { generateTrip } from '@/lib/agents';
import { tripPreferencesSchema } from '@/lib/validations';
import { listTrips, saveTrip } from '@/lib/db/trips';
import { getUserFromRequest } from '@/lib/serverAuth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get('userId');
    const user = await getUserFromRequest(request);
    const userId = queryUserId || user?.id || null;

    const result = await listTrips(userId);
    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data || [] });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch trips' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { preferences } = body;
    const user = await getUserFromRequest(request);
    const userId = user?.id || body.userId || null;

    if (!preferences) {
      return NextResponse.json({ success: false, error: 'Preferences are required' }, { status: 400 });
    }

    const parseResult = tripPreferencesSchema.safeParse(preferences);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid preferences',
          details: parseResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const trip = await generateTrip(parseResult.data);
    const saveResult = await saveTrip(trip, userId || undefined);

    if (saveResult.error) {
      return NextResponse.json({ success: false, error: saveResult.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: saveResult.data || trip }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to create trip' }, { status: 500 });
  }
}
