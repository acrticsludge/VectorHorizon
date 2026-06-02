'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import type { CanvasState, TrajectoryDirection } from '@/lib/types/world';

interface VideoBuffer {
  url: string;
  direction: TrajectoryDirection;
  id: string;
}

export function useCanvasEngine() {
  const [state, setState] = useState<CanvasState>({ status: 'idle' });
  const [currentVideo, setCurrentVideo] = useState<VideoBuffer | null>(null);
  const [nextVideo, setNextVideo] = useState<VideoBuffer | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const currentRef = useRef<HTMLVideoElement>(null);
  const nextRef = useRef<HTMLVideoElement>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const playVideo = useCallback((video: VideoBuffer) => {
    if (currentVideo) {
      setNextVideo(video);
      setIsTransitioning(true);
      fadeTimeoutRef.current = setTimeout(() => {
        setCurrentVideo(video);
        setNextVideo(null);
        setIsTransitioning(false);
        setState({ status: 'playing' });
      }, 300);
    } else {
      setCurrentVideo(video);
      setState({ status: 'playing' });
    }
  }, [currentVideo]);

  const preloadVideo = useCallback((video: VideoBuffer) => { setNextVideo(video); }, []);
  const handleVideoEnded = useCallback(() => { setState({ status: 'idle' }); }, []);
  const setGenerating = useCallback((direction: TrajectoryDirection) => { setState({ status: 'generating', direction }); }, []);
  const setError = useCallback((message: string) => { setState({ status: 'error', message }); }, []);
  const setIdle = useCallback(() => { setState({ status: 'idle' }); }, []);
  const setCollision = useCallback((direction: TrajectoryDirection) => {
    setState({ status: 'collision', direction });
    setTimeout(() => setState({ status: 'idle' }), 1000);
  }, []);

  useEffect(() => { return () => { if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current); }; }, []);

  return { state, currentVideo, nextVideo, currentRef, nextRef, isTransitioning, playVideo, preloadVideo, setGenerating, setError, setIdle, setCollision, handleVideoEnded };
}
