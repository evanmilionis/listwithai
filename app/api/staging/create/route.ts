/**
 * app/api/staging/create/route.ts
 *
 * POST /api/staging/create
 * Body: FormData { image: File, roomType: string, style: string, reportId?: string }
 *
 * Flow:
 *   1. Auth check — must be signed-in agent
 *   2. Credit check — must have staging_credits > 0
 *   3. Upload image to Supabase Storage (public bucket)
 *   4. Create staging_jobs row (status: processing)
 *   5. Deduct 1 credit
 *   6. Call Decor8 AI API (synchronous — returns result directly)
 *   7. Update job row with result
 *   Returns: { jobId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createStagingJob } from '@/lib/reimagine';
import type { RoomType, RoomStyle } from '@/lib/reimagine';

export async function POST(req: NextRequest) {
  const supabase = createServiceClient();

  try {
    // ── 1. Auth ──────────────────────────────────────────────
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 2. Credit check ──────────────────────────────────────
    const { data: sub, error: subError } = await supabase
      .from('agent_subscriptions')
      .select('id, staging_credits, status')
      .eq('user_id', user.id)
      .single();

    if (subError || !sub) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 403 });
    }
    if (sub.status !== 'active') {
      return NextResponse.json({ error: 'Subscription is not active' }, { status: 403 });
    }
    if (sub.staging_credits <= 0) {
      return NextResponse.json(
        { error: 'No staging credits remaining. Purchase more to continue.' },
        { status: 402 }
      );
    }

    // ── 3. Parse form data ───────────────────────────────────
    const formData = await req.formData();
    const imageFile = formData.get('image') as File | null;
    const roomType  = (formData.get('roomType') as RoomType) ?? 'livingroom';
    const style     = (formData.get('style') as RoomStyle) ?? 'modern';
    const reportId  = formData.get('reportId') as string | null;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 10MB' }, { status: 400 });
    }

    // ── 4. Upload to Supabase Storage ────────────────────────
    const fileExt  = imageFile.name.split('.').pop() ?? 'jpg';
    const fileName = `staging/${user.id}/${Date.now()}.${fileExt}`;
    const buffer   = Buffer.from(await imageFile.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('staging-images')    // create this bucket in Supabase dashboard (public)
      .upload(fileName, buffer, {
        contentType: imageFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('staging-images')
      .getPublicUrl(fileName);

    // ── 5. Create staging_jobs row ───────────────────────────
    const { data: job, error: jobError } = await supabase
      .from('staging_jobs')
      .insert({
        user_id:            user.id,
        report_id:          reportId ?? null,
        agent_email:        user.email,
        original_image_url: publicUrl,
        room_type:          roomType,
        style:              style,
        status:             'processing',
      })
      .select('id')
      .single();

    if (jobError || !job) {
      console.error('Failed to create staging job:', jobError);
      return NextResponse.json({ error: 'Failed to create staging job' }, { status: 500 });
    }

    // ── 6. Deduct 1 credit ───────────────────────────────────
    const { error: creditError } = await supabase
      .from('agent_subscriptions')
      .update({ staging_credits: sub.staging_credits - 1 })
      .eq('id', sub.id);

    if (creditError) {
      console.error('Failed to deduct credit:', creditError);
    }

    // ── 7. Call Decor8 AI API ────────────────────────────────
    // Fire and forget — Decor8 is synchronous but may take 10-30s
    // Client polls /api/staging/[jobId] for status updates
    (async () => {
      try {
        const result = await createStagingJob(publicUrl, roomType, style);

        await supabase
          .from('staging_jobs')
          .update({
            status:        result.status,
            result_url:    result.result_url ?? null,
            error_message: result.error ?? null,
          })
          .eq('id', job.id);

        // If failed — refund the credit
        if (result.status === 'failed') {
          await supabase
            .from('agent_subscriptions')
            .update({ staging_credits: sub.staging_credits }) // restore original
            .eq('id', sub.id);
          console.log(`Staging job ${job.id} failed — credit refunded to ${user.email}`);
        }

      } catch (err) {
        console.error(`Background staging error for job ${job.id}:`, err);
        await supabase
          .from('staging_jobs')
          .update({ status: 'failed', error_message: String(err) })
          .eq('id', job.id);
        // Refund credit on error
        await supabase
          .from('agent_subscriptions')
          .update({ staging_credits: sub.staging_credits })
          .eq('id', sub.id);
      }
    })();

    // Return job ID immediately — client polls for result
    return NextResponse.json({ jobId: job.id, creditsRemaining: sub.staging_credits - 1 });

  } catch (error) {
    console.error('Staging create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
