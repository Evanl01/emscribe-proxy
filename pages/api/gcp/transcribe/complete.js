import { transcribe_recording } from "@/pages/api/gcp/transcribe";
import { mask_phi } from "@/pages/api/aws/mask-phi";
import { authenticateRequest } from "@/src/utils/authenticateRequest";

/**
 * Helper: transcribe a recording via Cloud Run then mask PHI.
 * Throws on error so callers (e.g. prompt-llm) can catch and propagate.
 *
 * @param {object} opts
 * @param {string} opts.recording_file_signed_url - signed url to recording
 * @param {import('http').IncomingMessage} [opts.req] - optional incoming req for authenticateRequest
 * @param {object} [opts.user] - optional authenticated user (if already available)
 * @returns {Promise<{ cloudRunData: any, maskResult: any }>}
 */
export async function transcribe_and_mask({ recording_file_signed_url, req, user } = {}) {
  if (!recording_file_signed_url || typeof recording_file_signed_url !== "string") {
    const e = new Error("recording_file_signed_url is required");
    e.status = 400;
    throw e;
  }

  // Authenticate if user not provided
  if (!user) {
    if (!req) {
      const e = new Error("Either req or user must be provided for authentication");
      e.status = 400;
      throw e;
    }
    const { user: authUser, error: authError } = await authenticateRequest(req);
    if (authError || !authUser) {
      const e = new Error("Authentication failed");
      e.status = 401;
      throw e;
    }
    user = authUser;
  }

  // 1) Transcribe via Cloud Run (transcribe_recording should throw on failure)
  console.log("Step 1: [transcribe_recording]");
  let cloudRunData;
  try {
    cloudRunData = await transcribe_recording({ recording_file_signed_url, req, user });
  } catch (err) {
    // Log full error + stack before wrapping/propagating
    console.error("transcribe_recording error:", err?.message || err);
    console.error(err?.stack || err);

    // preserve original error as cause and include original stack
    const e = new Error(err?.message || "Transcription failed");
    if (err?.status) e.status = err.status;
    e.cause = err;
    if (err?.stack) {
      e.stack = `${e.stack}\nCaused by: ${err.stack}`;
    }
    throw e;
  }

  // 2) Extract transcript text from common response shapes
  const transcriptText =
    cloudRunData?.transcript ||
    null;

  if (!transcriptText || typeof transcriptText !== "string") {
    const e = new Error("Transcription returned no transcript text");
    e.status = 500;
    e.cloudRunData = cloudRunData;
    throw e;
  }

  // 3) Mask PHI
  let maskResult;
  try {
    maskResult = await mask_phi(transcriptText);
  } catch (err) {
    // Log full error + stack before wrapping/propagating
    console.error("mask_phi error:", err?.message || err);
    console.error(err?.stack || err);

    // preserve original error as cause and include original stack
    const e = new Error(err?.message || "Masking PHI failed");
    if (err?.status) e.status = err.status;
    e.cause = err;
    if (err?.stack) {
      e.stack = `${e.stack}\nCaused by: ${err.stack}`;
    }
    throw e;
  }

  // If maskResult is a fetch Response-like object, try to read .ok/.json
  if (maskResult && typeof maskResult === "object" && "ok" in maskResult && typeof maskResult.ok === "boolean") {
    if (!maskResult.ok) {
      const e = new Error("Mask PHI endpoint returned failure");
      e.status = 500;
      e.details = maskResult;
      throw e;
    }
    // attempt to normalize to JSON body if available
    if (typeof maskResult.json === "function") {
      const body = await maskResult.json();
      return { cloudRunData, maskResult: body };
    }
  }

  // Return structured result for callers
  return { cloudRunData, maskResult };
}

// Keep existing HTTP handler for backward compatibility
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { recording_file_signed_url } = req.body || {};
    const result = await transcribe_and_mask({ recording_file_signed_url, req });
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error("/api/gcp/transcribe/complete error:", err);
    const status = err?.status || 400;
    const payload = { error: err?.message || String(err) };
    if (err?.cloudRunData) payload.cloudRunData = err.cloudRunData;
    if (err?.details) payload.details = err.details;
    return res.status(status).json(payload);
  }
}