'use client';
import { useRef, useCallback, useState } from 'react';
import type { TrajectoryDirection } from '@/lib/types/world';
import { generateTransition } from '@/lib/api/worker';

interface UseJoystickControllerOptions {
  worldId: string;
  currentFrameBase64: string;
  onGenerationStart: (direction: TrajectoryDirection) => void;
  onGenerationComplete: (direction: TrajectoryDirection, videoUrl: string, transitionId: string) => void;
  onCollision: (direction: TrajectoryDirection) => void;
  onError: (message: string) => void;
}

function directionToTrajectoryVector(direction: TrajectoryDirection): string {
  const vectors: Record<TrajectoryDirection, string> = {
    forward: 'The camera moves forward at walking pace. Objects grow larger. Perspective converges toward the vanishing point. New surfaces and details become visible. Physics consistent: gravity downward, objects maintain scale, parallax shifts naturally.',
    backward: 'The camera reverses. Objects shrink. The field of view widens. Previously occluded regions appear. Physics consistent: motion blur proportional to speed, objects maintain scale.',
    left: 'The camera pans left. Objects slide right in the frame. New left-side surfaces come into view. Parallax reveals depth behind foreground objects.',
    right: 'The camera pans right. Objects slide left. New right-side surfaces come into view. Parallax reveals depth behind foreground objects.',
  };
  return vectors[direction];
}

export function useJoystickController(options: UseJoystickControllerOptions) {
  const { worldId, currentFrameBase64, onGenerationStart, onGenerationComplete, onCollision, onError } = options;
  const [isGenerating, setIsGenerating] = useState(false);
  const [queueDirection, setQueueDirection] = useState<TrajectoryDirection | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const executeDirection = useCallback(async (direction: TrajectoryDirection) => {
    // Guard: don't send empty base64 — prevents 400 from worker
    if (!currentFrameBase64) {
      onError('World image not loaded yet — please wait');
      setIsGenerating(false);
      return;
    }

    setIsGenerating(true);
    onGenerationStart(direction);
    setQueueDirection(null);
    abortRef.current = new AbortController();

    try {
      const result = await generateTransition({ worldId, direction, imageBase64: currentFrameBase64, trajectoryVector: directionToTrajectoryVector(direction) });
      if (result.error) {
        onError(result.error);
        setIsGenerating(false);
        return;
      }
      if (result.data) {
        onGenerationComplete(direction, result.data.videoUrl, result.data.transitionId);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      onError(err instanceof Error ? err.message : 'Generation failed');
    }
    setIsGenerating(false);
  }, [worldId, currentFrameBase64, onGenerationStart, onGenerationComplete, onError]);

  const handleDirection = useCallback((direction: TrajectoryDirection) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (isGenerating) {
        setQueueDirection(direction);
        if (abortRef.current) abortRef.current.abort();
      } else {
        executeDirection(direction);
      }
    }, 200);
  }, [isGenerating, executeDirection]);

  return { handleDirection, isGenerating, queueDirection };
}
