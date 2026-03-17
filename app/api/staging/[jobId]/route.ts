/**
 * app/api/staging/[jobId]/route.ts
 * GET /api/staging/[jobId]
 * Returns current status of a staging job.
 * Client polls this every 5 seconds until status === 'complete' or 'failed'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const supabase = createServiceClient();
  const { jobId } = await params;

  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: job, error } = await supabase
      .from('staging_jobs')
      .select('id, status, result_url, error_message, original_image_url, room_type, style, created_at')
      .eq('id', jobId)
      .eq('user_id', user.id) // RLS — agents can only see their own jobs
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('Staging poll error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
