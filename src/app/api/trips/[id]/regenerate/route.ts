import { NextRequest, NextResponse } from 'next/server';
import { generateTrip } from '@/lib/agents';
import { getRegeneratePatchSections, getTripById, mergePreferences, saveTrip } from '@/lib/db/trips';
import type { TripRegenerateRequest } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function applySectionPatch(
  existingTrip: Awaited<ReturnType<typeof getTripById>>['data'],
  regeneratedTrip: NonNullable<Awaited<ReturnType<typeof getTripById>>['data']>,
  sections: string[]
) {
  if (!existingTrip) return regeneratedTrip;

  const nextTrip = { ...existingTrip };

  if (sections.includes('destinations')) {
    nextTrip.destinations = regeneratedTrip.destinations;
    nextTrip.destinationSummary = regeneratedTrip.destinationSummary;
    nextTrip.title = regeneratedTrip.title;
  }
  if (sections.includes('budget')) {
    nextTrip.budgetBreakdown = regeneratedTrip.budgetBreakdown;
    nextTrip.budget = regeneratedTrip.budget;
    nextTrip.warnings = regeneratedTrip.warnings;
  }
  if (sections.includes('route')) {
    nextTrip.route = regeneratedTrip.route;
  }
  if (sections.includes('itinerary') || sections.includes('activities')) {
    nextTrip.itinerary = regeneratedTrip.itinerary.map((newDay) => {
      const existingDay = existingTrip.itinerary?.find((d) => d.day === newDay.day);
      if (existingDay?.locked) {
        return existingDay;
      }
      return newDay;
    });
  } else if (sections.includes('stays')) {
    nextTrip.itinerary = regeneratedTrip.itinerary.map((newDay) => {
      const existingDay = existingTrip.itinerary?.find((d) => d.day === newDay.day);
      if (existingDay?.locked) {
        return existingDay;
      }
      return {
        ...newDay,
        activities: existingDay?.activities || newDay.activities,
      };
    });
  }

  nextTrip.agents = regeneratedTrip.agents;
  nextTrip.weatherSnapshots = regeneratedTrip.weatherSnapshots;
  nextTrip.localExperiences = regeneratedTrip.localExperiences;
  nextTrip.confidenceScore = regeneratedTrip.confidenceScore;
  nextTrip.updatedAt = new Date().toISOString();

  return nextTrip;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Partial<TripRegenerateRequest> & { userId?: string };

    const current = await getTripById(id, body.userId);
    if (current.error || !current.data) {
      return NextResponse.json({ success: false, error: current.error || 'Trip not found' }, { status: 404 });
    }

    const sections = getRegeneratePatchSections(body);
    const mergedPrefs = mergePreferences(current.data.preferences, body.preferences);

    const regenerated = await generateTrip(mergedPrefs);
    const patchedTrip = applySectionPatch(current.data, regenerated, sections);

    const saveResult = await saveTrip(patchedTrip, body.userId || current.data.userId);
    if (saveResult.error) {
      return NextResponse.json({ success: false, error: saveResult.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: saveResult.data,
      meta: {
        regeneratedSections: sections,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to regenerate trip' }, { status: 500 });
  }
}
