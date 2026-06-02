# VectorHorizon — Google Stitch UI Prompts

Use these prompts in Google Stitch (stitch.withgoogle.com) to generate production-quality UI screens. Each prompt describes a single page. Stitch should produce React components with Tailwind CSS.

**Design direction:** Dark mode by default (zinc-950 background), Geist font, single accent color (zinc-900/white), sparse minimalist design. No AI slop (no gradient heroes, no 3-card grids, no purple glows).

---

## 1. Landing Page (`/`)

Generate a marketing landing page for "VectorHorizon" — an AI tool that turns any image into a walkable 3D world using NVIDIA Cosmos.

- Asymmetric hero: left side has headline "Turn any image into a walkable world" + subtext "Upload a photo, press forward, and watch NVIDIA Cosmos generate a physically consistent 3D video environment." + "Get Started" primary button + "Sign In" secondary link
- Right side of hero shows a stylized representation of the canvas — a dark rounded rectangle with subtle grid lines and a small play button
- Navbar at top: "VectorHorizon" logo text on left, "Sign In" + "Get Started" buttons on right
- Footer: "Powered by NVIDIA Cosmos 3 · Clerk Auth · Supabase"
- No gradient backgrounds, no emojis, no "Scroll to explore"

## 2. Dashboard (`/dashboard`)

Generate a dashboard page for authenticated users to see their created worlds.

- Top navbar: "VectorHorizon" logo + UserButton (avatar dropdown from Clerk) on right
- Page heading: "My Worlds" with a "New World" button on the right
- If worlds exist: a grid of world cards (2-3 columns). Each card shows the world's thumbnail image (16:9 rounded rectangle), world name, and creation date
- If no worlds: an empty state with a subtle icon, "No worlds yet" text, description "Upload an image and start exploring. Your generated worlds will appear here.", and a "Create Your First World" button
- Each card is clickable and links to `/world/[id]`

## 3. New World (`/world/new`)

Generate an image upload page.

- Heading: "New World" with subtext "Upload an image to serve as your starting environment."
- A large drag-and-drop zone (dashed border rounded rectangle) with "Drop an image here, or click to browse" text and subtext "JPEG, PNG, WebP — max 10MB"
- When file is selected, the zone shows a preview thumbnail and file name
- Below: "Start Exploring" button that navigates to the world canvas

## 4. World Canvas (`/world/[id]`)

Generate the interactive world canvas page — the main product experience.

- Top: small "World Canvas" heading and a status indicator showing "Ready" / "Generating forward..." / "Playing"
- Main area: a large 16:9 rounded dark rectangle (the viewport where videos play). It shows the initial uploaded image as a placeholder
- Bottom-right corner of the viewport: a virtual D-pad joystick overlay (circular, dark semi-transparent) with 4 arrow buttons (↑→↓←) arranged in a cross pattern. Center dot. Each button is 48×48px minimum
- During generation: the viewport shows a subtle loading indicator (not a generic spinner — preferably a subtle pulse or directional blur effect matching the chosen direction)
- On error: a small toast notification appears at the bottom-center

**TypeScript component props each page expects (to be wired up later):**

### Landing Page
- No props (static content)

### Dashboard
Props: `worlds: Array<{id: string, name: string, imageUrl: string, date: string}>`, `loading: boolean`

### New World
Props: `onFileSelect: (file: File) => void`, `uploading: boolean`, `error?: string`

### World Canvas
Props: `state: 'idle' | 'generating' | 'playing' | 'error'`, `initialImageUrl: string`, `videoUrl?: string`, `onDirection: (dir: string) => void`, `isGenerating: boolean`, `errorMessage?: string`
