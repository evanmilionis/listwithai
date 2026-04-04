import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId, offer } = body as {
      reportId: string;
      offer: {
        offerPrice: number;
        downPayment: number;
        financingType: string;
        inspectionContingency: boolean;
        financingContingency: boolean;
        appraisalContingency: boolean;
        closingDate: string;
        earnestMoney: number;
        sellerConcessions: number;
        notes: string;
      };
    };

    if (!reportId || !offer?.offerPrice) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: report, error } = await supabase
      .from('reports')
      .select('property_address, property_city, property_state, property_zip, asking_price, beds, baths, sqft, report_output')
      .eq('id', reportId)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const pricing = report.report_output?.pricing;
    const priceRange = pricing?.price_range ?? `around $${report.asking_price?.toLocaleString()}`;
    const listPrice = report.asking_price ?? offer.offerPrice;
    const pctOfAsking = ((offer.offerPrice / listPrice) * 100).toFixed(1);
    const netAfterConcessions = offer.offerPrice - (offer.sellerConcessions || 0);

    const prompt = `You are an expert real estate negotiation advisor. Analyze this purchase offer and provide actionable guidance to the seller.

PROPERTY:
- Address: ${report.property_address}, ${report.property_city}, ${report.property_state} ${report.property_zip}
- Beds/Baths/Sqft: ${report.beds}bd / ${report.baths}ba / ${report.sqft?.toLocaleString()} sqft
- Asking Price: $${listPrice.toLocaleString()}
- AI Recommended Price Range: ${priceRange}

OFFER TERMS:
- Offer Price: $${offer.offerPrice.toLocaleString()} (${pctOfAsking}% of asking)
- Down Payment: ${offer.downPayment}%
- Financing Type: ${offer.financingType}
- Earnest Money: $${offer.earnestMoney.toLocaleString()}
- Seller Concessions Requested: $${(offer.sellerConcessions || 0).toLocaleString()}
- Net to Seller (after concessions): $${netAfterConcessions.toLocaleString()}
- Closing Date: ${offer.closingDate}
- Inspection Contingency: ${offer.inspectionContingency ? 'Yes' : 'No'}
- Financing Contingency: ${offer.financingContingency ? 'Yes' : 'No'}
- Appraisal Contingency: ${offer.appraisalContingency ? 'Yes' : 'No'}
- Additional Notes: ${offer.notes || 'None'}

Respond ONLY with valid JSON matching this exact schema:
{
  "verdict": "accept" | "counter" | "reject",
  "verdict_reason": "1-2 sentence summary",
  "strength_score": 1-10,
  "red_flags": ["string", ...],
  "green_flags": ["string", ...],
  "counter_strategy": {
    "recommended_counter_price": number,
    "concessions_counter": number,
    "closing_date_notes": "string",
    "contingency_notes": "string"
  },
  "negotiation_talking_points": ["string", ...],
  "bottom_line": "string — plain English advice in 2-3 sentences"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse analysis' }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ analysis });
  } catch (err) {
    console.error('Offer analysis error:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
