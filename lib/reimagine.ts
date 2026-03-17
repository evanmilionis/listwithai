/**
 * lib/reimagine.ts
 * REimagineHome API client for virtual staging.
 * Docs: https://docs.reimaginehome.ai
 *
 * Flow:
 *   1. createStagingJob()  — POST image + style → returns job_id
 *   2. getStagingJob()     — GET job_id → returns status + result_url when done
 *   3. pollStagingJob()    — polls until complete or timeout
 */

export type RoomStyle =
  | 'modern'
  | 'coastal'
  | 'traditional'
  | 'scandinavian'
  | 'industrial'
  | 'farmhouse';

export type RoomType =
  | 'living_room'
  | 'bedroom'
  | 'dining_room'
  | 'kitchen'
  | 'bathroom'
  | 'office';

export interface StagingJobResult {
  job_id: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  result_url: string | null;
  error: string | null;
}

function getApiKey(): string {
  const key = process.env.REIMAGINE_API_KEY;
  if (!key) throw new Error('REIMAGINE_API_KEY is not set');
  return key;
}

const BASE_URL = 'https://api.reimaginehome.ai/v1';

/**
 * Submit a virtual staging job.
 * imageUrl must be a publicly accessible URL (upload to Supabase Storage first).
 */
export async function createStagingJob(
  imageUrl: string,
  roomType: RoomType,
  style: RoomStyle
): Promise<string> {
  const res = await fetch(`${BASE_URL}/virtual-staging`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      room_type: roomType,
      design_style: style,
      mask_type: 'auto',        // auto-detect furniture to replace
      num_images: 1,            // 1 output per credit
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`REimagineHome createJob failed: ${res.status} — ${err}`);
  }

  const data = await res.json();
  return data.job_id as string;
}

/**
 * Fetch the current status of a staging job.
 */
export async function getStagingJob(jobId: string): Promise<StagingJobResult> {
  const res = await fetch(`${BASE_URL}/virtual-staging/${jobId}`, {
    headers: { 'Authorization': `Bearer ${getApiKey()}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`REimagineHome getJob failed: ${res.status} — ${err}`);
  }

  const data = await res.json();

  return {
    job_id: data.job_id,
    status: data.status,
    result_url: data.result_url ?? data.output_url ?? null,
    error: data.error ?? null,
  };
}

/**
 * Poll a staging job every 5 seconds until complete or timeout.
 * Max wait: 3 minutes (REimagineHome typically takes 30-90 seconds).
 */
export async function pollStagingJob(
  jobId: string,
  timeoutMs = 180_000
): Promise<StagingJobResult> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const job = await getStagingJob(jobId);

    if (job.status === 'complete' || job.status === 'failed') {
      return job;
    }

    await new Promise(r => setTimeout(r, 5000)); // poll every 5s
  }

  return {
    job_id: jobId,
    status: 'failed',
    result_url: null,
    error: 'Timeout — job took longer than 3 minutes',
  };
}
