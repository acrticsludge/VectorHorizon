# Product Specification & Architectural Blueprint: The Semantic World-Builder (Clerk + Supabase DB Edition)

This document outlines the fine-grained features, system architecture, database schema, and security protocols for building the **Semantic World-Builder** web application. This architecture unbundles compute, state, authentication, and file storage to achieve ultra-low latency, zero egress cost, and absolute minimization of Vercel Free Tier compute consumption.

---

## 1. Product Core Vision & Concept

The Semantic World-Builder is an interactive, stateful spatial AI sandbox that turns static 2D imagery into physically consistent, controllable 3D video environments. Utilizing **NVIDIA Cosmos 3** (Physical AI World Models), the application allows authenticated users to interactively "drive" through an image using joystick/directional controls. The system records every movement trajectory, generating future video frames that adhere to real-world physics while persistently saving the user's generated world states.

---

## 2. Interactive & Visual Features

### 2.1 The Stateful Spatial Canvas
* **Viewport Engine:** A custom HTML5 Canvas wrapper that blends static images smoothly into video transitions.
* **Virtual Joystick Controls:** Web-based overlay inputs (Forward, Backward, Left Pan, Right Pan, Orbit) that map pixel actions to physical spatial trajectories.
* **Dynamic Trajectory Vectoring:** Translates real-time UI mouse clicks or gesture slides into explicit text prompts appended with hidden directional vectors optimized for Cosmos 3.

### 2.2 Interactive Temporal Previews & Persistence
* **Physics-Aware Generations:** Visual output correctly computes gravity, perspective shifting, occlusion, and surface lighting.
* **Infinite Horizon Expansion:** A seamless generation loop where the final frame of a previous 3-second generated video serves as the prompt baseline for the next user movement action.
* **Historical Timeline Exploration:** Users can save their worlds, view a history of their generational paths, and "rewind" a world to a previous checkpoint.

### 2.3 Visual Asset Pipeline
* **Drag-and-Drop Environment Upload:** Instant front-end compression and aspect-ratio checking for initial layout inputs.
* **Hybrid Storage Pattern:** Media files are optimized and sent directly to high-performance object storage, while pointers, metadata, and user IDs are indexed in a relational database.

---

## 3. Highly Optimized Technology Stack

| Component | Technology | Tier Selection | Functional Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | Next.js / React (Vite) | Vercel (Hobby Tier) | Renders the visual workspace. Functions strictly as a static asset server. |
| **Authentication** | Clerk | Free Tier | Handles user login, registration, and JWT template generation. |
| **Edge Compute API** | Cloudflare Workers | Free Tier | Orchestration layer. Validates Clerk JWTs and handles NVIDIA API streaming. |
| **Database** | Supabase Postgres | Free Tier | Stores world metadata and history. Secured using Row Level Security (RLS). |
| **Object Storage** | Cloudflare R2 | Free Tier (10GB) | $0 Egress storage for user uploads and generated MP4 outputs. |
| **Physical AI Engine** | NVIDIA Cosmos 3 NIM | Developer Free Tier | High-performance physical AI inference endpoints. |

---

## 4. System Architecture & Data Flow

1. **Authentication:** User logs in via Clerk. Clerk issues a JWT signed specifically for Supabase.
2. **Authorization:** Frontend injects the Clerk JWT into the `Authorization` header for all Cloudflare Worker and Supabase calls.
3. **Storage Access:** Frontend requests a presigned upload URL from the Cloudflare Worker. Worker validates JWT and returns a secure R2 link.
4. **AI Inference:** User moves the joystick. Worker validates JWT, calls NVIDIA Cosmos 3, and receives the physical world video.
5. **Persistence:** Worker saves the `.mp4` to R2 and logs the `world_transition` record in Supabase Postgres.
6. **Delivery:** The video is streamed back to the frontend canvas for real-time rendering.

---

## 5. Database Schema & RLS

```sql
-- Enable RLS
ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_transitions ENABLE ROW LEVEL SECURITY;

-- Worlds Table
CREATE TABLE public.worlds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL, -- Clerk User ID
  name text DEFAULT 'My World',
  initial_image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS: Users only see their own worlds
CREATE POLICY "Users can only select their own worlds" 
ON public.worlds FOR SELECT 
USING (auth.jwt()->>'sub' = user_id);

-- World Transitions Table
CREATE TABLE public.world_transitions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  world_id uuid REFERENCES public.worlds(id) ON DELETE CASCADE NOT NULL,
  user_id text NOT NULL,
  direction text NOT NULL,
  video_url text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
```

---

## 6. Security Protocol

* **Key Isolation:** NVIDIA and Supabase Service keys are never exposed to the frontend; they live in Cloudflare Worker environment variables.
* **JWT Verification:** All AI and Storage operations are gated behind a Clerk JWT verification check at the Cloudflare Edge.
* **RLS Enforcement:** The database ensures data privacy even if the frontend logic is compromised.

---

## 7. Implementation Roadmap

1. **Phase 1:** Setup Clerk Auth and the Next.js Canvas UI.
2. **Phase 2:** Configure Supabase Postgres with the Clerk JWT template and RLS policies.
3. **Phase 3:** Deploy Cloudflare Worker with R2 integration for asset handling.
4. **Phase 4:** Integrate NVIDIA Cosmos 3 NIM for real-time physics-based video generation.
5. **Phase 5:** Implement state synchronization between the Canvas and Supabase history.
