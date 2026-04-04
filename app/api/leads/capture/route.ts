import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendLeadNurtureEmail } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    const leadData: Record<string, unknown> = {};

    // Only include fields that are present in the request body
    const allowedFields = [
      'email',
      'name',
      'phone',
      'property_address',
      'property_city',
      'property_zip',
      'beds',
      'baths',
      'sqft',
      'asking_price',
      'form_step_reached',
      'source',
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'notes',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined && body[field] !== null && body[field] !== '') {
        leadData[field] = body[field];
      }
    }

    // If we have an existing lead ID, update it
    if (body.lead_id) {
      const { data, error } = await supabase
        .from('leads')
        .update(leadData)
        .eq('id', body.lead_id)
        .select('id')
        .single();

      if (error) {
        console.error('Failed to update lead:', error);
        return NextResponse.json(
          { error: 'Failed to update lead' },
          { status: 500 }
        );
      }

      return NextResponse.json({ id: data.id });
    }

    // If we have an email, upsert by email to avoid duplicates
    if (leadData.email) {
      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('email', leadData.email)
        .eq('converted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('leads')
          .update(leadData)
          .eq('id', existing.id)
          .select('id')
          .single();

        if (error) {
          console.error('Failed to update existing lead:', error);
          return NextResponse.json(
            { error: 'Failed to update lead' },
            { status: 500 }
          );
        }

        return NextResponse.json({ id: data.id });
      }
    }

    // Create a new lead
    const { data, error } = await supabase
      .from('leads')
      .insert(leadData)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create lead:', error);
      return NextResponse.json(
        { error: 'Failed to create lead' },
        { status: 500 }
      );
    }

    // Send nurture email if this is an exit-intent lead with just an email
    if (leadData.email && body.source === 'exit_intent') {
      sendLeadNurtureEmail(leadData.email as string).catch(() => {});
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error('Lead capture error:', error);
    return NextResponse.json(
      { error: 'Failed to capture lead' },
      { status: 500 }
    );
  }
}
