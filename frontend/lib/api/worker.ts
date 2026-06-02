import { type ApiResponse, type GenerationRequest, type GenerationResponse } from '@/lib/types/world';

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787';

async function fetchWorker<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await window.Clerk?.session?.getToken();
  if (!token) return { error: 'Not authenticated' };

  try {
    const res = await fetch(`${WORKER_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    const body = await res.json();
    if (!res.ok) return { error: body.error || `Request failed with status ${res.status}` };
    return { data: body.data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function uploadImage(file: File): Promise<ApiResponse<{ worldId: string; imageUrl: string }>> {
  const token = await window.Clerk?.session?.getToken();
  if (!token) return { error: 'Not authenticated' };

  try {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${WORKER_URL}/worlds`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const body = await res.json();
    if (!res.ok) return { error: body.error || 'Upload failed' };
    return { data: body.data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Upload failed' };
  }
}

export async function generateTransition(
  req: GenerationRequest
): Promise<ApiResponse<GenerationResponse['data']>> {
  return fetchWorker('/generate', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function listWorlds(): Promise<ApiResponse<Array<{ id: string; name: string; initial_image_url: string; created_at: string }>>> {
  return fetchWorker('/worlds');
}

export async function deleteWorld(worldId: string): Promise<ApiResponse<{ deleted: boolean }>> {
  const token = await window.Clerk?.session?.getToken();
  if (!token) return { error: 'Not authenticated' };

  try {
    const res = await fetch(`${WORKER_URL}/worlds/${worldId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    if (!res.ok) return { error: body.error || 'Delete failed' };
    return { data: body.data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}
