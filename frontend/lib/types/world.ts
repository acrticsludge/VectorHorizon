/** Direction a user can request the camera to move */
export type TrajectoryDirection = 'forward' | 'backward' | 'left' | 'right';

/** User-created world from an initial image */
export interface World {
  id: string;
  userId: string;
  name: string;
  initialImageUrl: string;
  createdAt: string;
  transitionCount?: number;
}

/** A single camera movement and its generated video */
export interface WorldTransition {
  id: string;
  worldId: string;
  userId: string;
  direction: TrajectoryDirection;
  videoUrl: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/** Request body sent to Cloudflare Worker for generation */
export interface GenerationRequest {
  worldId: string;
  direction: TrajectoryDirection;
  imageBase64: string;
  trajectoryVector: string;
}

/** Response from Cloudflare Worker after generation */
export interface GenerationResponse {
  data?: {
    videoUrl: string;
    transitionId: string;
  };
  error?: string;
}

/** The canvas state machine */
export type CanvasState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'generating'; direction: TrajectoryDirection }
  | { status: 'playing' }
  | { status: 'collision'; direction: TrajectoryDirection }
  | { status: 'error'; message: string };

/** Worker API response envelope */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
