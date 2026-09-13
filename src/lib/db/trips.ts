import type { PostgrestError } from '@supabase/supabase-js';
import type { Trip, TripPreferences, TripRegenerateRequest } from '@/types';
import { createServerSupabase } from '@/lib/supabase';

interface ServiceResult<T> {
  data?: T;
  error?: string;
  details?: PostgrestError | unknown;
}

interface TripRecord {
  id: string;
  user_id: string | null;
  title: string;
  destination_summary: string;
  start_date: string | null;
  end_date: string | null;
  duration: number;
  budget: number;
  travelers: number;
  status: string;
  confidence_score: number;
  warnings: string[];
  preferences_json: TripPreferences;
  final_itinerary_json: Trip['itinerary'];
  raw_agent_outputs: Record<string, unknown>;
  weather_snapshots_json: Trip['weatherSnapshots'];
  local_experiences_json: Trip['localExperiences'];
  budget_breakdown_json: Trip['budgetBreakdown'];
  route_json: Trip['route'];
  created_at: string;
  updated_at: string;
}

function ensureDbEnv(): ServiceResult<true> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return {
      error: 'Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    };
  }

  return { data: true };
}

function toTrip(record: TripRecord): Trip {
  const agents = Array.isArray(record.raw_agent_outputs.agents)
    ? (record.raw_agent_outputs.agents as Trip['agents'])
    : [];
  const destinations = Array.isArray(record.raw_agent_outputs.destinations)
    ? (record.raw_agent_outputs.destinations as Trip['destinations'])
    : [];

  return {
    id: record.id,
    userId: record.user_id || undefined,
    title: record.title,
    destinationSummary: record.destination_summary,
    startDate: record.start_date || '',
    endDate: record.end_date || '',
    duration: record.duration,
    budget: Number(record.budget),
    travelers: record.travelers,
    status: record.status as Trip['status'],
    preferences: record.preferences_json,
    destinations,
    itinerary: record.final_itinerary_json || [],
    budgetBreakdown: record.budget_breakdown_json,
    route: record.route_json,
    agents,
    weatherSnapshots: record.weather_snapshots_json || [],
    localExperiences: record.local_experiences_json || [],
    confidence: '',
    budgetFit: '',
    weatherFit: '',
    routeFit: '',
    confidenceScore: record.confidence_score,
    warnings: record.warnings || [],
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    locked: false,
  };
}

function toTripInsert(trip: Trip, userId?: string | null) {
  return {
    id: trip.id,
    user_id: userId || trip.userId || null,
    title: trip.title,
    destination_summary: trip.destinationSummary,
    start_date: trip.startDate || null,
    end_date: trip.endDate || null,
    duration: trip.duration,
    budget: trip.budget,
    travelers: trip.travelers,
    status: trip.status,
    confidence_score: trip.confidenceScore,
    warnings: trip.warnings,
    preferences_json: trip.preferences,
    final_itinerary_json: trip.itinerary,
    raw_agent_outputs: {
      agents: trip.agents,
      destinations: trip.destinations,
    },
    weather_snapshots_json: trip.weatherSnapshots,
    local_experiences_json: trip.localExperiences,
    budget_breakdown_json: trip.budgetBreakdown,
    route_json: trip.route,
  };
}

export async function saveTrip(trip: Trip, userId?: string | null): Promise<ServiceResult<Trip>> {
  const envCheck = ensureDbEnv();
  if (envCheck.error) return { error: envCheck.error };

  const db = createServerSupabase();
  const payload = toTripInsert(trip, userId);

  const { data, error } = await db
    .from('trips')
    .upsert(payload)
    .select('*')
    .single();

  if (error) {
    return { error: 'Failed to save trip', details: error };
  }

  const tripRecord = data as TripRecord;
  await saveTripArtifacts(trip.id, trip);

  return { data: toTrip(tripRecord) };
}

export async function listTrips(userId?: string | null): Promise<ServiceResult<Trip[]>> {
  const envCheck = ensureDbEnv();
  if (envCheck.error) return { error: envCheck.error };

  const db = createServerSupabase();
  let query = db.from('trips').select('*').order('created_at', { ascending: false }).limit(100);
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;

  if (error) {
    return { error: 'Failed to fetch trips', details: error };
  }

  const trips = (data as TripRecord[]).map(toTrip);
  return { data: trips };
}

export async function getTripById(tripId: string, userId?: string | null): Promise<ServiceResult<Trip>> {
  const envCheck = ensureDbEnv();
  if (envCheck.error) return { error: envCheck.error };

  const db = createServerSupabase();
  let query = db.from('trips').select('*').eq('id', tripId).limit(1);
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query.single();

  if (error) {
    return { error: 'Trip not found', details: error };
  }

  return { data: toTrip(data as TripRecord) };
}

export async function patchTripById(
  tripId: string,
  updates: Partial<Pick<Trip, 'title' | 'destinationSummary' | 'startDate' | 'endDate' | 'duration' | 'budget' | 'travelers' | 'status' | 'preferences'>>,
  userId?: string | null
): Promise<ServiceResult<Trip>> {
  const envCheck = ensureDbEnv();
  if (envCheck.error) return { error: envCheck.error };

  const db = createServerSupabase();
  const payload: Record<string, unknown> = {};

  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.destinationSummary !== undefined) payload.destination_summary = updates.destinationSummary;
  if (updates.startDate !== undefined) payload.start_date = updates.startDate || null;
  if (updates.endDate !== undefined) payload.end_date = updates.endDate || null;
  if (updates.duration !== undefined) payload.duration = updates.duration;
  if (updates.budget !== undefined) payload.budget = updates.budget;
  if (updates.travelers !== undefined) payload.travelers = updates.travelers;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.preferences !== undefined) payload.preferences_json = updates.preferences;

  let query = db.from('trips').update(payload).eq('id', tripId);
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query.select('*').single();

  if (error) {
    return { error: 'Failed to update trip', details: error };
  }

  return { data: toTrip(data as TripRecord) };
}

export async function deleteTripById(tripId: string, userId?: string | null): Promise<ServiceResult<true>> {
  const envCheck = ensureDbEnv();
  if (envCheck.error) return { error: envCheck.error };

  const db = createServerSupabase();
  let query = db.from('trips').delete().eq('id', tripId);
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query.select('id');

  if (error) {
    return { error: 'Failed to delete trip', details: error };
  }

  // RLS/ownership mismatch or already-deleted trip: nothing was removed.
  if (!data || data.length === 0) {
    return { error: 'Trip not found' };
  }

  return { data: true };
}

export async function saveTripArtifacts(tripId: string, trip: Trip): Promise<ServiceResult<true>> {
  const envCheck = ensureDbEnv();
  if (envCheck.error) return envCheck;

  const db = createServerSupabase();

  await db.from('trip_budget_items').delete().eq('trip_id', tripId);
  await db.from('trip_weather_snapshots').delete().eq('trip_id', tripId);
  await db.from('trip_agents').delete().eq('trip_id', tripId);
  await db.from('trip_routes').delete().eq('trip_id', tripId);

  if (trip.budgetBreakdown?.items?.length) {
    const { error } = await db.from('trip_budget_items').insert(
      trip.budgetBreakdown.items.map((item) => ({
        trip_id: tripId,
        category: item.category,
        label: item.label,
        amount: item.amount,
        currency: item.currency,
        notes: item.notes || null,
      }))
    );
    if (error) return { error: 'Failed to save budget items', details: error };
  }

  if (trip.weatherSnapshots?.length) {
    const { error } = await db.from('trip_weather_snapshots').insert(
      trip.weatherSnapshots.map((snapshot) => ({ trip_id: tripId, snapshot }))
    );
    if (error) return { error: 'Failed to save weather snapshots', details: error };
  }

  if (trip.agents?.length) {
    const { error } = await db.from('trip_agents').insert(
      trip.agents.map((agent) => ({
        trip_id: tripId,
        agent_id: agent.id,
        name: agent.name,
        status: agent.status,
        progress: agent.progress,
        output_summary: agent.outputSummary || null,
        payload: agent,
      }))
    );
    if (error) return { error: 'Failed to save agents', details: error };
  }

  if (trip.route) {
    const { error } = await db.from('trip_routes').upsert({ trip_id: tripId, route: trip.route });
    if (error) return { error: 'Failed to save route', details: error };
  }

  return { data: true };
}

export function mergePreferences(base: TripPreferences, patch?: Partial<TripPreferences>): TripPreferences {
  if (!patch) return base;
  return {
    ...base,
    ...patch,
    foodPreferences: patch.foodPreferences ?? base.foodPreferences,
    accessibilityNeeds: patch.accessibilityNeeds ?? base.accessibilityNeeds,
    companions: patch.companions ?? base.companions,
  };
}

export function getRegeneratePatchSections(request: Partial<TripRegenerateRequest>): string[] {
  if (!request.sections || !request.sections.length) {
    return ['destinations', 'budget', 'itinerary', 'route', 'stays', 'activities'];
  }
  return request.sections;
}
