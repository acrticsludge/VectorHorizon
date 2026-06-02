import type { Env } from "./types";

// Replace with your actual R2 public bucket URL after creating the bucket
const R2_PUBLIC_BASE = "https://pub-800c55710a42465eb604aa933812de4f.r2.dev";

export async function uploadToR2(
  env: Env,
  key: string,
  body: ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<string> {
  await env.WORLD_ASSETS.put(key, body, { httpMetadata: { contentType } });
  return key;
}

export function getPublicUrl(key: string): string {
  return `${R2_PUBLIC_BASE}/${key}`;
}
