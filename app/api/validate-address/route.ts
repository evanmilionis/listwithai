import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { address, city, state, zipCode } = await request.json();

    if (!address || !city || !state || !zipCode) {
      return NextResponse.json(
        { valid: false, message: 'All address fields are required.' },
        { status: 400 }
      );
    }

    // Use Rentcast property lookup to verify the address exists
    const params = new URLSearchParams({ address, city, state, zipCode });
    const res = await fetch(
      `https://api.rentcast.io/v1/properties?${params}`,
      {
        headers: {
          'X-Api-Key': process.env.RENTCAST_API_KEY!,
          Accept: 'application/json',
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return NextResponse.json({ valid: true });
      }
    }

    // Address not found — return helpful message
    return NextResponse.json({
      valid: false,
      message:
        'We couldn\'t verify this address. Please double-check your street address, city, and zip code. Make sure it matches your property\'s official mailing address.',
    });
  } catch (error) {
    console.error('Address validation error:', error);
    // Don't block checkout on validation errors — let them proceed
    return NextResponse.json({ valid: true });
  }
}
