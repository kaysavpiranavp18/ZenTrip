import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTripById, patchTripById } from '@/lib/db/trips';
import { upsertUserMemory } from '@/lib/db/extras';
import { tripPreferencesSchema } from '@/lib/validations';
import { getUserFromRequest } from '@/lib/serverAuth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const patchSchema = z.object({
  userId: z.string().optional(),
  updateMemory: z.boolean().default(true),
  preferences: tripPreferencesSchema.partial(),
});

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid preferences payload',
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    let { userId } = parsed.data;
    const { preferences, updateMemory } = parsed.data;

    if (!userId) {
      const user = await getUserFromRequest(request);
      if (user) userId = user.id;
    }

    const tripResult = await getTripById(id, userId);
    if (tripResult.error || !tripResult.data) {
      return NextResponse.json({ success: false, error: tripResult.error || 'Trip not found' }, { status: 404 });
    }

    const mergedPreferences = {
      ...tripResult.data.preferences,
      ...preferences,
      foodPreferences: preferences.foodPreferences ?? tripResult.data.preferences.foodPreferences,
      accessibilityNeeds: preferences.accessibilityNeeds ?? tripResult.data.preferences.accessibilityNeeds,
      companions: preferences.companions ?? tripResult.data.preferences.companions,
    };

    const patchResult = await patchTripById(id, { preferences: mergedPreferences }, userId);
    if (patchResult.error) {
      return NextResponse.json({ success: false, error: patchResult.error }, { status: 500 });
    }

    if (updateMemory && userId) {
      await upsertUserMemory(userId, preferences);
    }

    return NextResponse.json({ success: true, data: patchResult.data });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update trip preferences' }, { status: 500 });
  }
}
