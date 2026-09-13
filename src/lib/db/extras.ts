import type { Trip, TripPreferences, Companion } from '@/types';
import { createServerSupabase } from '@/lib/supabase';

interface ServiceResult<T> {
  data?: T;
  error?: string;
}

type AccessLevel = 'view' | 'comment' | 'edit';
type ExportType = 'pdf' | 'json' | 'calendar' | 'checklist';

function isDbConfigured(): boolean {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && key);
}

function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

function generateShareSlug(title: string): string {
  const base = sanitizeSlug(title || 'trip-share');
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base}-${rand}`;
}

export async function saveCompanionsWithVotes(
  tripId: string,
  companions: Companion[]
): Promise<ServiceResult<true>> {
  if (!isDbConfigured()) {
    return { error: 'Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' };
  }

  const db = createServerSupabase();
  await db.from('trip_companions').delete().eq('trip_id', tripId);

  if (!companions.length) return { data: true };

  const payload = companions.map((companion) => ({
    trip_id: tripId,
    id: companion.id,
    name: companion.name,
    preferences: companion.preferences || {},
    votes: companion.votes || {},
  }));

  const { error } = await db.from('trip_companions').insert(payload);
  if (error) {
    return { error: 'Failed to save companion votes' };
  }

  return { data: true };
}

function pickMostFrequent(values: string[]): string | undefined {
  if (!values.length) return undefined;
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
}

export function mergeGroupPreferences(base: TripPreferences, companions: Companion[]): TripPreferences {
  const voteValues = companions.flatMap((c) => Object.entries(c.votes || {}));
  const getVotes = (key: string) => voteValues.filter(([k]) => k === key).map(([, v]) => String(v));

  const votedTripType = pickMostFrequent(getVotes('tripType')) as TripPreferences['tripType'] | undefined;
  const votedPace = pickMostFrequent(getVotes('pace')) as TripPreferences['pace'] | undefined;
  const votedClimate = pickMostFrequent(getVotes('climatePreference')) as TripPreferences['climatePreference'] | undefined;
  const votedTransport = pickMostFrequent(getVotes('transportPreference')) as TripPreferences['transportPreference'] | undefined;

  const budgetVotes = getVotes('budget').map((v) => Number(v)).filter((v) => !Number.isNaN(v));
  const avgBudget = budgetVotes.length ? Math.round(budgetVotes.reduce((sum, v) => sum + v, 0) / budgetVotes.length) : undefined;

  const mergedFood = new Set(base.foodPreferences);
  companions.forEach((companion) => {
    const food = companion.preferences?.foodPreferences;
    if (Array.isArray(food)) {
      food.forEach((item) => {
        if (typeof item === 'string' && item.trim()) mergedFood.add(item);
      });
    }
  });

  return {
    ...base,
    tripType: votedTripType || base.tripType,
    pace: votedPace || base.pace,
    climatePreference: votedClimate || base.climatePreference,
    transportPreference: votedTransport || base.transportPreference,
    budget: avgBudget || base.budget,
    foodPreferences: [...mergedFood],
    companions,
    travelers: Math.max(base.travelers, companions.length || base.travelers),
  };
}

export async function upsertUserMemory(
  userId: string,
  preferences: Partial<TripPreferences>,
  likes: string[] = [],
  dislikes: string[] = []
): Promise<ServiceResult<true>> {
  if (!isDbConfigured()) {
    return { error: 'Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' };
  }

  const db = createServerSupabase();
  const { error } = await db.from('user_memory').upsert({
    user_id: userId,
    preferences,
    likes,
    dislikes,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: 'Failed to update user memory' };
  }

  return { data: true };
}

export async function getUserMemory(userId: string): Promise<ServiceResult<Record<string, unknown>>> {
  if (!isDbConfigured()) {
    return { error: 'Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' };
  }

  const db = createServerSupabase();
  const { data, error } = await db.from('user_memory').select('*').eq('user_id', userId).maybeSingle();

  if (error) {
    return { error: 'Failed to fetch user memory' };
  }

  return { data: data || {} };
}

export async function createShareLink(
  tripId: string,
  title: string,
  accessLevel: AccessLevel,
  createdBy?: string,
  expiresAt?: string
): Promise<ServiceResult<{ slug: string }>> {
  if (!isDbConfigured()) {
    return { error: 'Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' };
  }

  const db = createServerSupabase();
  const slug = generateShareSlug(title);

  const { error } = await db.from('shared_links').insert({
    trip_id: tripId,
    slug,
    access_level: accessLevel,
    expires_at: expiresAt || null,
    created_by: createdBy || null,
  });

  if (error) {
    return { error: 'Failed to create share link' };
  }

  return { data: { slug } };
}

export async function listShareLinks(tripId: string): Promise<ServiceResult<Record<string, unknown>[]>> {
  if (!isDbConfigured()) {
    return { error: 'Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' };
  }

  const db = createServerSupabase();
  const { data, error } = await db
    .from('shared_links')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: 'Failed to fetch share links' };
  }

  return { data: data || [] };
}

export async function createExportJob(
  trip: Trip,
  exportType: ExportType,
  requestedBy?: string
): Promise<ServiceResult<Record<string, unknown>>> {
  if (!isDbConfigured()) {
    return { error: 'Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' };
  }

  const db = createServerSupabase();

  const payload = {
    tripId: trip.id,
    tripTitle: trip.title,
    generatedAt: new Date().toISOString(),
    requestedBy: requestedBy || null,
    type: exportType,
  };

  let status = 'queued';
  let fileUrl: string | null = null;

  if (exportType === 'json') {
    status = 'completed';
    fileUrl = `/api/trips/${trip.id}`;
  } else if (exportType === 'pdf' || exportType === 'checklist' || exportType === 'calendar') {
    status = 'completed';
    const shareResult = await listShareLinks(trip.id);
    let slug = '';
    if (shareResult.data && shareResult.data.length > 0) {
      slug = shareResult.data[0].slug as string;
    } else {
      const createResult = await createShareLink(trip.id, trip.title, 'view', requestedBy);
      if (createResult.data) {
        slug = createResult.data.slug;
      }
    }
    if (slug) {
      if (exportType === 'pdf') {
        fileUrl = `/shared/${slug}?print=true`;
      } else if (exportType === 'checklist') {
        fileUrl = `/shared/${slug}?tab=checklist`;
      } else {
        fileUrl = `/shared/${slug}`;
      }
    }
  }

  const { data, error } = await db
    .from('exports')
    .insert({
      trip_id: trip.id,
      export_type: exportType,
      status,
      payload,
      file_url: fileUrl,
    })
    .select('*')
    .single();

  if (error) {
    return { error: 'Failed to create export job' };
  }

  return { data: data || {} };
}

export async function listExportJobs(tripId: string): Promise<ServiceResult<Record<string, unknown>[]>> {
  if (!isDbConfigured()) {
    return { error: 'Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' };
  }

  const db = createServerSupabase();
  const { data, error } = await db
    .from('exports')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: 'Failed to fetch export jobs' };
  }

  return { data: data || [] };
}
