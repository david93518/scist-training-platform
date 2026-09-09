/**
 * Cloudflare Stream — video hosting.
 * Docs: https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/
 *
 * Flow: the admin asks for a one-time upload URL, the browser POSTs the file
 * straight to it, then we poll until Cloudflare has encoded the video.
 * Without credentials every function runs in mock mode.
 */
import { env, features } from "../env";

const API = "https://api.cloudflare.com/client/v4";

export interface DirectUpload {
  mode: "direct" | "mock";
  uploadUrl?: string;
  uid: string;
}

export async function createDirectUpload(meta: { name: string; lessonId: string; maxDurationSeconds?: number }): Promise<DirectUpload> {
  if (!features.stream()) {
    return { mode: "mock", uid: "mock-" + meta.lessonId + "-" + Date.now().toString(36) };
  }
  const { CF_ACCOUNT_ID, CF_STREAM_API_TOKEN } = env();
  const res = await fetch(API + "/accounts/" + CF_ACCOUNT_ID + "/stream/direct_upload", {
    method: "POST",
    headers: { authorization: "Bearer " + CF_STREAM_API_TOKEN, "content-type": "application/json" },
    body: JSON.stringify({
      maxDurationSeconds: meta.maxDurationSeconds ?? 7200,
      meta: { name: meta.name, lessonId: meta.lessonId },
      requireSignedURLs: false,
    }),
  });
  const data = (await res.json()) as { success: boolean; result?: { uploadURL: string; uid: string }; errors?: unknown };
  if (!data.success || !data.result) throw new Error("Stream direct_upload failed: " + JSON.stringify(data.errors));
  return { mode: "direct", uploadUrl: data.result.uploadURL, uid: data.result.uid };
}

export type StreamStatus = "uploading" | "processing" | "ready" | "error";

export async function getVideoStatus(uid: string): Promise<StreamStatus> {
  if (!features.stream() || uid.startsWith("mock-")) return "ready";
  const { CF_ACCOUNT_ID, CF_STREAM_API_TOKEN } = env();
  const res = await fetch(API + "/accounts/" + CF_ACCOUNT_ID + "/stream/" + uid, {
    headers: { authorization: "Bearer " + CF_STREAM_API_TOKEN },
  });
  const data = (await res.json()) as { success: boolean; result?: { readyToStream: boolean; status?: { state: string } } };
  if (!data.success || !data.result) return "error";
  if (data.result.readyToStream) return "ready";
  const state = data.result.status?.state;
  if (state === "error") return "error";
  if (state === "pendingupload") return "uploading";
  return "processing";
}

/** iframe src for the public player */
export function playbackUrl(uid: string) {
  const code = env().CF_STREAM_CUSTOMER_CODE;
  if (!code) return null;
  return "https://customer-" + code + ".cloudflarestream.com/" + uid + "/iframe";
}

export function thumbnailUrl(uid: string) {
  const code = env().CF_STREAM_CUSTOMER_CODE;
  if (!code) return null;
  return "https://customer-" + code + ".cloudflarestream.com/" + uid + "/thumbnails/thumbnail.jpg";
}
