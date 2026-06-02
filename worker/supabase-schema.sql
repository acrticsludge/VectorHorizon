-- VectorHorizon Schema
-- Run in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Worlds table
CREATE TABLE IF NOT EXISTS public.worlds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  name text DEFAULT 'My World',
  initial_image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- World transitions table
CREATE TABLE IF NOT EXISTS public.world_transitions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  world_id uuid REFERENCES public.worlds(id) ON DELETE CASCADE NOT NULL,
  user_id text NOT NULL,
  direction text NOT NULL,
  video_url text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_worlds_user_id ON public.worlds(user_id);
CREATE INDEX IF NOT EXISTS idx_transitions_world_id ON public.world_transitions(world_id);
CREATE INDEX IF NOT EXISTS idx_transitions_user_id ON public.world_transitions(user_id);

-- Row Level Security
ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_transitions ENABLE ROW LEVEL SECURITY;

-- Users can only see/use their own worlds
CREATE POLICY "Users can select own worlds" ON public.worlds FOR SELECT USING (auth.jwt()->>'sub' = user_id);
CREATE POLICY "Users can insert own worlds" ON public.worlds FOR INSERT WITH CHECK (auth.jwt()->>'sub' = user_id);
CREATE POLICY "Users can delete own worlds" ON public.worlds FOR DELETE USING (auth.jwt()->>'sub' = user_id);

-- Users can only see/use their own transitions
CREATE POLICY "Users can select own transitions" ON public.world_transitions FOR SELECT USING (auth.jwt()->>'sub' = user_id);
CREATE POLICY "Users can insert own transitions" ON public.world_transitions FOR INSERT WITH CHECK (auth.jwt()->>'sub' = user_id);
CREATE POLICY "Users can delete own transitions" ON public.world_transitions FOR DELETE USING (auth.jwt()->>'sub' = user_id);
