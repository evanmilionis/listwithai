import type {
  RentcastData,
  RentcastProperty,
  RentcastValuation,
  RentcastMarket,
} from '@/types';

const RENTCAST_BASE = 'https://api.rentcast.io/v1';

function headers(): HeadersInit {
  return {
    'X-Api-Key': process.env.RENTCAST_API_KEY!,
    Accept: 'application/json',
  };
}

/**
 * Fetch property records for a given address.
 */
export async function fetchPropertyRecords(
  address: string,
  city: string,
  state: string,
  zipCode: string
): Promise<RentcastProperty | null> {
  try {
    const params = new URLSearchParams({ address, city, state, zipCode });
    const res = await fetch(`${RENTCAST_BASE}/properties?${params}`, {
      headers: headers(),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`Rentcast properties error: ${res.status} ${res.statusText} — ${body.substring(0, 200)}`);
      return null;
    }

    const data = await res.json();
    // API returns an array; take the first match
    return Array.isArray(data) ? data[0] ?? null : data;
  } catch (error) {
    console.error('Rentcast fetchPropertyRecords failed:', error);
    return null;
  }
}

/**
 * Fetch AVM value estimate for a property.
 */
export async function fetchValueEstimate(
  address: string,
  city: string,
  state: string,
  zipCode: string,
  bedrooms: number,
  bathrooms: number,
  squareFootage: number,
  propertyType: string
): Promise<RentcastValuation | null> {
  try {
    const params = new URLSearchParams({
      address,
      city,
      state,
      zipCode,
      bedrooms: String(bedrooms),
      bathrooms: String(bathrooms),
      squareFootage: String(squareFootage),
      propertyType,
      compCount: '10',
    });

    const res = await fetch(`${RENTCAST_BASE}/avm/value?${params}`, {
      headers: headers(),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`Rentcast valuation error: ${res.status} ${res.statusText} — ${body.substring(0, 200)}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error('Rentcast fetchValueEstimate failed:', error);
    return null;
  }
}

/**
 * Fetch market stats (Sale data, 12 months history) for a zip code.
 */
export async function fetchMarketStats(
  zipCode: string
): Promise<RentcastMarket | null> {
  try {
    const params = new URLSearchParams({
      zipCode,
      dataType: 'Sale',
      historyMonths: '12',
    });

    const res = await fetch(`${RENTCAST_BASE}/markets?${params}`, {
      headers: headers(),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`Rentcast market error: ${res.status} ${res.statusText} — ${body.substring(0, 200)}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error('Rentcast fetchMarketStats failed:', error);
    return null;
  }
}

/**
 * Convenience: call all three Rentcast endpoints in parallel.
 */
export async function fetchAllRentcastData(params: {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  propertyType: string;
}): Promise<RentcastData> {
  const [property, valuation, market] = await Promise.all([
    fetchPropertyRecords(params.address, params.city, params.state, params.zipCode),
    fetchValueEstimate(
      params.address,
      params.city,
      params.state,
      params.zipCode,
      params.bedrooms,
      params.bathrooms,
      params.squareFootage,
      params.propertyType
    ),
    fetchMarketStats(params.zipCode),
  ]);

  return { property, valuation, market };
}
