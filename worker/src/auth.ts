import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Env } from './types';

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS(env: Env) {
  if (!jwksCache) {
    const url = new URL(env.CLERK_JWKS_URL);
    jwksCache = createRemoteJWKSet(url);
  }
  return jwksCache;
}

export async function verifyAuth(token: string, env: Env): Promise<{ userId: string } | { error: string }> {
  try {
    const JWKS = getJWKS(env);
    const { payload } = await jwtVerify(token, JWKS, { algorithms: ['RS256'] });
    const sub = payload.sub as string;
    if (!sub) return { error: 'Invalid token: no subject' };
    return { userId: sub };
  } catch (err) {
    return { error: 'Invalid or expired token' };
  }
}
