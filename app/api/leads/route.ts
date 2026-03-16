import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Check admin secret
    const adminSecret = process.env.ADMIN_SECRET;
    const providedSecret =
      request.headers.get('x-admin-secret') ||
      request.nextUrl.searchParams.get('secret');

    if (!adminSecret || providedSecret !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { searchParams } = request.nextUrl;

    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by converted status
    const converted = searchParams.get('converted');
    if (converted === 'true') {
      query = query.eq('converted', true);
    } else if (converted === 'false') {
      query = query.eq('converted', false);
    }

    // Filter by form step reached
    const step = searchParams.get('step');
    if (step) {
      query = query.gte('form_step_reached', Number(step));
    }

    // Limit
    const limit = searchParams.get('limit');
    if (limit) {
      query = query.limit(Number(limit));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch leads:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    return NextResponse.json({ leads: data, count: data?.length ?? 0 });
  } catch (error) {
    console.error('Leads fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
