import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTripById } from '@/lib/db/trips';
import { createExportJob, listExportJobs } from '@/lib/db/extras';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const exportSchema = z.object({
  userId: z.string().optional(),
  exportType: z.enum(['pdf', 'json', 'calendar', 'checklist']).default('json'),
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

    const jobs = await listExportJobs(id);
    if (jobs.error) {
      return NextResponse.json({ success: false, error: jobs.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: jobs.data || [] });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load export jobs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = exportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid export payload',
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { userId, exportType } = parsed.data;

    const tripResult = await getTripById(id, userId);
    if (tripResult.error || !tripResult.data) {
      return NextResponse.json({ success: false, error: tripResult.error || 'Trip not found' }, { status: 404 });
    }

    const exportJob = await createExportJob(tripResult.data, exportType, userId);
    if (exportJob.error || !exportJob.data) {
      return NextResponse.json({ success: false, error: exportJob.error || 'Failed to create export job' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: exportJob.data }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to start export' }, { status: 500 });
  }
}
