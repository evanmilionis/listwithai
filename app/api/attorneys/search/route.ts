import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');
  const state = searchParams.get('state');

  if (!city || !state) {
    return NextResponse.json({ error: 'city and state are required' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 500 });
  }

  try {
    const query = encodeURIComponent(`real estate attorney ${city} ${state}`);
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`
    );

    if (!res.ok) {
      return NextResponse.json({ attorneys: [] });
    }

    const data = await res.json();
    const results = (data.results ?? []).slice(0, 6);

    const attorneys = results.map((place: Record<string, unknown>) => ({
      name: place.name as string,
      address: place.formatted_address as string,
      rating: place.rating as number | undefined,
      total_ratings: place.user_ratings_total as number | undefined,
      maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((place.name as string) + ' ' + (place.formatted_address as string))}`,
    }));

    return NextResponse.json({ attorneys });
  } catch (error) {
    console.error('Attorney search failed:', error);
    return NextResponse.json({ attorneys: [] });
  }
}
