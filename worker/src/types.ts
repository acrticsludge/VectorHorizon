export type TrajectoryDirection = 'forward' | 'backward' | 'left' | 'right';

export interface GenerationRequest {
  worldId: string;
  direction: TrajectoryDirection;
  imageBase64: string;
  trajectoryVector: string;
}

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CLERK_JWKS_URL: string;
  WORLD_ASSETS: R2Bucket;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
