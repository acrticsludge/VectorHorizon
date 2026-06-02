import type { Env } from './types';

interface CosmosResponse {
  videoBase64: string;
  seed: number;
}

export async function generateVideo(
  env: Env,
  inputImageBase64: string,
  trajectoryPrompt: string,
  previousVideoBase64?: string
): Promise<CosmosResponse | { error: string }> {
  const baseUrl = env.NVIDIA_COSMOS_BASE_URL || 'https://integrate.api.nvidia.com/v1';

  // Accept both raw base64 and data URLs — strip data: prefix if present
  const imageData = inputImageBase64.startsWith('data:')
    ? inputImageBase64
    : `data:image/jpeg;base64,${inputImageBase64}`;

  const payload: Record<string, unknown> = {
    model: 'nvidia/cosmos-predict2.5-video2world',
    prompt: trajectoryPrompt,
    image: imageData,
    video_params: {
      height: 720,
      width: 1280,
      num_frames: 24,
      fps: 8,
    },
  };

  if (previousVideoBase64) {
    payload.video = `data:video/mp4;base64,${previousVideoBase64}`;
  }

  try {
    const response = await fetch(`${baseUrl}/videos/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.NVIDIA_COSMOS_API_KEY}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { error: `Cosmos API error (${response.status}): ${errText.slice(0, 200)}` };
    }

    const result = await response.json() as { b64_video?: string; seed?: number; error?: string };
    if (result.error) return { error: result.error };
    if (!result.b64_video) return { error: 'Cosmos returned no video data' };

    return { videoBase64: result.b64_video, seed: result.seed ?? 0 };
  } catch (err) {
    return { error: `Cosmos request failed: ${err instanceof Error ? err.message : 'unknown'}` };
  }
}
