const SPACE_NAME = "multimodalart/Cosmos3-Nano";
const SPACE_URL = `https://${SPACE_NAME.replace("/", "-")}.hf.space`.toLowerCase();

interface GradioFileData {
  path: string;
  url?: string | null;
}

interface GenerateResponse {
  event_id: string;
}

export async function generateVideo(
  inputImageBase64: string,
  trajectoryPrompt: string,
): Promise<{ videoUrl: string } | { error: string }> {
  try {
    // 1. Decode base64 image to binary
    const imageBinary = decodeBase64Image(inputImageBase64);
    if (!imageBinary) {
      return { error: "Invalid image data — upload a new image and try again" };
    }

    // 2. Upload image to Gradio temp storage
    const imageFile = await uploadImage(imageBinary);
    if (!imageFile) {
      return { error: "Failed to upload image to generation service" };
    }

    // 3. Call the generate endpoint (Gradio SSE v3 protocol)
    const eventId = await startGeneration(imageFile, trajectoryPrompt);
    if (!eventId) {
      return { error: "Failed to start video generation" };
    }

    // 4. Poll for result via SSE stream
    const resultData = await pollForResult(eventId);
    if ("error" in resultData) {
      return resultData;
    }

    // Returns array: [imageFileData, videoFileData, seedUsed]
    const videoFileData = resultData[1] as GradioFileData | null;
    if (!videoFileData?.path) {
      return { error: "Generation did not produce a video file" };
    }

    const videoUrl =
      videoFileData.url ??
      (videoFileData.path.startsWith("http")
        ? videoFileData.path
        : `${SPACE_URL}${videoFileData.path}`);

    return { videoUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("timeout") || message.includes("timed out")) {
      return {
        error:
          "Generation timed out. The Space may be cold-starting or busy. Try again in a minute.",
      };
    }
    return { error: `Video generation failed: ${message}` };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function decodeBase64Image(base64: string): Uint8Array | null {
  try {
    const raw = base64.replace(/^data:image\/\w+;base64,/, "");
    const chars = atob(raw);
    const bytes = new Uint8Array(chars.length);
    for (let i = 0; i < chars.length; i++) {
      bytes[i] = chars.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function uploadImage(
  imageBinary: Uint8Array,
): Promise<{ path: string; meta: { _type: string } } | null> {
  const formData = new FormData();
  formData.append(
    "files",
    new Blob([imageBinary], { type: "image/jpeg" }),
    "conditioning_image.jpg",
  );

  const res = await fetch(`${SPACE_URL}/gradio_api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) return null;

  const result = (await res.json()) as unknown[];
  if (!Array.isArray(result) || result.length === 0) return null;

  // Gradio returns either ["/path/to/file"] or [{ path: "/path/to/file", ... }]
  const raw = result[0];
  const path: string | undefined =
    typeof raw === "string" ? raw : (raw as Record<string, unknown>)?.path as string | undefined;

  if (!path) return null;

  return { path, meta: { _type: "gradio.FileData" } };
}

async function startGeneration(
  imageFile: { path: string; meta: { _type: string } },
  prompt: string,
): Promise<string | null> {
  const res = await fetch(`${SPACE_URL}/gradio_api/call/v2/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "Video",
      prompt,
      image: imageFile,
      resolution: "480p (832x480, fast)",
      num_frames: 65,
      steps: 25,
      guidance: 6.0,
      enable_sound: false,
      negative_prompt: "",
      seed: 0,
      randomize_seed: true,
    }),
  });

  if (!res.ok) return null;

  const body = (await res.json()) as GenerateResponse;
  return body.event_id ?? null;
}

async function pollForResult(
  eventId: string,
): Promise<unknown[] | { error: string }> {
  const res = await fetch(
    `${SPACE_URL}/gradio_api/call/generate/${eventId}`,
  );

  if (!res.ok) {
    return { error: "Failed to retrieve generation result" };
  }

  const sseText = await res.text();

  // Split SSE events by double-newline
  const events = sseText.split("\n\n");

  for (const event of events) {
    const lines = event.split("\n");
    let eventType = "";
    let dataStr = "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        dataStr = line.slice(6).trim();
      }
    }

    if (eventType === "process_completed" && dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed?.data && Array.isArray(parsed.data)) {
          return parsed.data;
        }
      } catch {
        continue;
      }
    }

    if (eventType === "error" && dataStr) {
      try {
        const errData = JSON.parse(dataStr);
        const msg =
          typeof errData === "string"
            ? errData
            : errData?.error ?? "Generation service error";
        return { error: msg };
      } catch {
        return { error: dataStr };
      }
    }
  }

  return {
    error:
      "Generation completed but no video result was found in the response",
  };
}
