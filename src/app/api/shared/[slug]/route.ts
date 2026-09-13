import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { getTripById } from '@/lib/db/trips';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 });
    }

    const db = createServerSupabase();

    // Look up the share link by slug
    const { data: link, error: linkError } = await db
      .from('shared_links')
      .select('*')
      .eq('slug', slug)
      .single();

    if (linkError || !link) {
      return NextResponse.json({ success: false, error: 'Share link not found' }, { status: 404 });
    }

    // Check expiry
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: 'This share link has expired' }, { status: 410 });
    }

    // Fetch the trip (no userId check — shared link grants access)
    const tripResult = await getTripById(link.trip_id);
    if (tripResult.error || !tripResult.data) {
      return NextResponse.json({ success: false, error: 'Trip not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        trip: tripResult.data,
        accessLevel: link.access_level,
        expiresAt: link.expires_at,
        slug,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load shared trip' }, { status: 500 });
  }
}
