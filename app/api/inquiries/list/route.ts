import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

/**
 * GET /api/inquiries/list?report_id=<uuid>
 * Returns all buyer inquiries submitted for a given report, newest first.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get('report_id');
    if (!reportId) {
      return NextResponse.json({ error: 'report_id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: inquiries } = await supabase
      .from('buyer_inquiries')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false });

    return NextResponse.json({ inquiries: inquiries ?? [] });
  } catch (error) {
    console.error('List inquiries error:', error);
    return NextResponse.json({ error: 'Failed to list inquiries' }, { status: 500 });
  }
}

/**
 * PATCH /api/inquiries/list?id=<uuid>
 * Body: { contacted: boolean }
 * Toggles the "contacted" flag on an inquiry.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const body = await req.json();
    const contacted = Boolean(body.contacted);

    const supabase = createServiceClient();
    await supabase
      .from('buyer_inquiries')
      .update({
        contacted,
        contacted_at: contacted ? new Date().toISOString() : null,
      })
      .eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update inquiry error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
