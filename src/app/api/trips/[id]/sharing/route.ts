import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTripById } from '@/lib/db/trips';
import { createShareLink, listShareLinks } from '@/lib/db/extras';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const createShareSchema = z.object({
  userId: z.string().optional(),
  accessLevel: z.enum(['view', 'comment', 'edit']).default('view'),
  expiresAt: z.string().optional(),
});

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const tripResult = await getTripById(id, userId);
    if (tripResult.error || !tripResult.data) {
      return NextResponse.json({ success: false, error: tripResult.error || 'Trip not found' }, { status: 404 });
    }

    const linksResult = await listShareLinks(id);
    if (linksResult.error) {
      return NextResponse.json({ success: false, error: linksResult.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: linksResult.data || [] });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load share links' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = createShareSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid share payload',
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { userId, accessLevel, expiresAt } = parsed.data;

    const tripResult = await getTripById(id, userId);
    if (tripResult.error || !tripResult.data) {
      return NextResponse.json({ success: false, error: tripResult.error || 'Trip not found' }, { status: 404 });
    }

    const share = await createShareLink(id, tripResult.data.title, accessLevel, userId, expiresAt);
    if (share.error || !share.data) {
      return NextResponse.json({ success: false, error: share.error || 'Failed to create link' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          slug: share.data.slug,
          url: `/shared/${share.data.slug}`,
          accessLevel,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to create share link' }, { status: 500 });
  }
}
