import { Client, handle_file } from "@gradio/client";
import type { Env } from "./types";

const SPACE_NAME = "multimodalart/Cosmos3-Nano";
const GRADIO_ENDPOINT = "/predict";

interface GradioResult {
  data: [string];
}

export async function generateVideo(
  env: Env,
  inputImageBase64: string,
  trajectoryPrompt: string,
): Promise<{ videoUrl: string } | { error: string }> {
  try {
    const app = await Client.connect(SPACE_NAME);

    const rawBase64 = inputImageBase64.replace(/^data:image\/\w+;base64,/, "");
    const byteChars = atob(rawBase64);
    const byteNums = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }
    const imageBlob = new Blob([byteNums], { type: "image/jpeg" });

    const result = await app.predict(GRADIO_ENDPOINT, {
      prompt: trajectoryPrompt,
      mode: "Video",
      conditioningImage: handle_file(imageBlob),
      generateAudio: false,
      seed: 0,
    }) as GradioResult;

    const videoFilePath = result.data?.[0];
    if (!videoFilePath) {
      return { error: "Space returned no video file" };
    }

    let videoUrl: string;
    if (videoFilePath.startsWith("http://") || videoFilePath.startsWith("https://")) {
      videoUrl = videoFilePath;
    } else if (videoFilePath.startsWith("/")) {
      videoUrl = `https://${SPACE_NAME.replace("/", "-")}.hf.space${videoFilePath}`;
    } else {
      videoUrl = `https://${SPACE_NAME.replace("/", "-")}.hf.space/${videoFilePath}`;
    }

    return { videoUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("timeout") || message.includes("timed out")) {
      return { error: "Generation timed out. The Space may be cold-starting or busy." };
    }
    return { error: `Cosmos Space error: ${message}` };
  }
}
