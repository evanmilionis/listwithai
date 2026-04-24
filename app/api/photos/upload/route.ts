import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 30;

const BUCKET = 'property-photos';
const MAX_PHOTOS_PER_REPORT = 12;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/**
 * POST /api/photos/upload
 *
 * Multipart form with fields:
 *   - report_id: UUID (required)
 *   - file: image file (required, up to 10MB, jpeg/png/webp/heic)
 *
 * Uploads to Supabase Storage bucket `property-photos` at path
 * {report_id}/{uuid}.{ext}, creates a row in `property_photos` table,
 * returns the row.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const reportId = formData.get('report_id');
    const file = formData.get('file');

    if (typeof reportId !== 'string' || !reportId) {
      return NextResponse.json({ error: 'report_id is required' }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, WebP, or HEIC images are supported.' },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: 'Image is too large (max 10MB).' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify the report exists (no auth — this is the homeowner's own report)
    const { data: report } = await supabase
      .from('reports')
      .select('id')
      .eq('id', reportId)
      .single();

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Enforce photo cap
    const { count } = await supabase
      .from('property_photos')
      .select('id', { count: 'exact', head: true })
      .eq('report_id', reportId);

    if ((count ?? 0) >= MAX_PHOTOS_PER_REPORT) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PHOTOS_PER_REPORT} photos per property.` },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
    const filename = `${randomUUID()}.${ext}`;
    const storagePath = `${reportId}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Photo upload error:', uploadError);
      return NextResponse.json(
        {
          error: 'Failed to upload image. Make sure the property-photos bucket exists and is public.',
          detail: uploadError.message,
        },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;

    // Insert photo record
    const { data: photoRow, error: insertError } = await supabase
      .from('property_photos')
      .insert({
        report_id: reportId,
        url: publicUrl,
        storage_path: storagePath,
        order_index: count ?? 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Photo DB insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to record photo.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ photo: photoRow });
  } catch (error) {
    console.error('Photo upload handler error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

/**
 * DELETE /api/photos/upload?id=<photo_id>
 * Deletes the photo row and removes the underlying storage object.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const photoId = searchParams.get('id');
    if (!photoId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: photo } = await supabase
      .from('property_photos')
      .select('id, storage_path')
      .eq('id', photoId)
      .single();

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    if (photo.storage_path) {
      await supabase.storage.from(BUCKET).remove([photo.storage_path]);
    }

    await supabase.from('property_photos').delete().eq('id', photoId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Photo delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

/**
 * GET /api/photos/upload?report_id=<uuid>
 * Lists all photos for a given report.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get('report_id');
    if (!reportId) {
      return NextResponse.json({ error: 'report_id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: photos } = await supabase
      .from('property_photos')
      .select('*')
      .eq('report_id', reportId)
      .order('order_index', { ascending: true });

    return NextResponse.json({ photos: photos ?? [] });
  } catch (error) {
    console.error('Photo list error:', error);
    return NextResponse.json({ error: 'Failed to list photos' }, { status: 500 });
  }
}
