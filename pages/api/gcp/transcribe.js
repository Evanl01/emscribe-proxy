import { google } from "googleapis";
import { authenticateRequest } from "@/src/utils/authenticateRequest";

const CLOUD_RUN_URL =
  process.env.CLOUD_RUN_TRANSCRIBE_URL ||
  "https://emscribe-transcriber-641824253036.us-central1.run.app/transcribe";

// Helper: check signed URL by issuing a HEAD request
async function checkSignedUrlValid(url, timeoutMs = 10000) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(url, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeout);
    return resp.ok;
  } catch (err) {
    return false;
  }
}

// Exported helper: transcribe_recording
// Params:
// - recording_file_signed_url: signed URL to the recording (required)
// - req: optional Next.js request object; if provided, authenticateRequest(req) will be called
// - timeoutMs: optional timeout for the HEAD check
export async function transcribe_recording({ recording_file_signed_url, req = null, timeoutMs = 10000 } = {}) {
  if (!recording_file_signed_url || typeof recording_file_signed_url !== "string") {
    throw new Error("recording_file_signed_url is required");
  }

  // If caller provided a request, verify the user is authenticated
  if (req) {
    const { user, error: authError } = await authenticateRequest(req);
    if (authError || !user) {
      throw new Error("Authentication failed");
    }
  }

  // 1) Verify signed URL is still valid (HEAD request, no download)
  const isValid = await checkSignedUrlValid(recording_file_signed_url, timeoutMs);
  if (!isValid) {
    const err = new Error(`Invalid or expired recording_file_signed_url: ${recording_file_signed_url}`);
    err.code = "expired_signed_url";
    throw err;
  }
  console.log("Signed URL is valid:", recording_file_signed_url);

  // 2) Obtain ID token using service account credentials and call Cloud Run
  const auth = new google.auth.GoogleAuth({
    credentials: process.env.GCP_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY)
      : undefined,
    // DO NOT set scopes when you will call getIdTokenClient(audience)
  });
  const idClient = await auth.getIdTokenClient(CLOUD_RUN_URL);

  const cloudRunResp = await idClient.request({
    url: CLOUD_RUN_URL,
    method: "POST",
    data: { recording_file_signed_url },
    headers: { "Content-Type": "application/json" },
    timeout: 120000,
  });
  console.log("Cloud Run response:", cloudRunResp.status, cloudRunResp.data);
  return cloudRunResp.data;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 1) Verify user JWT
  const { user, error: authError } = await authenticateRequest(req);
  if (authError || !user) {
    return res.status(400).json({ error: "Authentication failed" });
  }
  // console.log("Authenticated user:", user.id);

  // 2) Parse body and delegate to exported helper
  const body = req.body || {};
  const { recording_file_signed_url } = body;
  try {
    const cloudRunData = await transcribe_recording({ recording_file_signed_url });
    console.log("Cloud Run response:", cloudRunData);
    return res.status(200).json({ ok: true, recording_file_signed_url, cloudRunResponse: cloudRunData ?? null });
  }
  catch (err) {
    console.error("GCP transcribe handler error:", err);
    const msg = err?.message || String(err);
    return res.status(400).json({ error: msg });
  }

}