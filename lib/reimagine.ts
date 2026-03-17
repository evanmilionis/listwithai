/**
 * lib/reimagine.ts
 * Decor8 AI API client for virtual staging.
 * Docs: https://api-docs.decor8.ai
 *
 * Decor8 is synchronous — POST image + style → get result image back directly.
 * No polling needed on the API side (client still polls our DB).
 */

export type RoomStyle =
  | 'modern'
  | 'coastal'
  | 'traditional'
  | 'scandinavian'
  | 'industrial'
  | 'farmhouse'
  | 'minimalist'
  | 'boho'
  | 'midcenturymodern'
  | 'contemporary'
  | 'transitional';

export type RoomType =
  | 'livingroom'
  | 'bedroom'
  | 'diningroom'
  | 'kitchen'
  | 'bathroom'
  | 'office';

export interface StagingJobResult {
  status: 'complete' | 'failed';
  result_url: string | null;
  error: string | null;
}

function getApiKey(): string {
  const key = process.env.DECOR8_API_KEY;
  if (!key) throw new Error('DECOR8_API_KEY is not set');
  return key;
}

const BASE_URL = 'https://api.decor8.ai';

/**
 * Submit a virtual staging request to Decor8 AI.
 * This is synchronous — it returns the result image directly.
 * imageUrl must be a publicly accessible HTTPS URL.
 */
export async function createStagingJob(
  imageUrl: string,
  roomType: RoomType,
  style: RoomStyle
): Promise<StagingJobResult> {
  const res = await fetch(`${BASE_URL}/generate_designs_for_room`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input_image_url: imageUrl,
      room_type: roomType,
      design_style: style,
      num_images: 1,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Decor8 API error: ${res.status} — ${err}`);
    return {
      status: 'failed',
      result_url: null,
      error: `Decor8 API error: ${res.status} — ${err}`,
    };
  }

  const data = await res.json();

  // Response format: { info: { images: [{ url: "..." }] } }
  const resultUrl = data?.info?.images?.[0]?.url ?? null;

  if (!resultUrl) {
    return {
      status: 'failed',
      result_url: null,
      error: 'No image returned from Decor8 API',
    };
  }

  return {
    status: 'complete',
    result_url: resultUrl,
    error: null,
  };
}
