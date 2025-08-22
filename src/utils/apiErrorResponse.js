import { NextResponse } from 'next/server';

/**
 * Build a consistent API error object.
 * @param {number} statusCode
 * @param {string} error - short error code or type
 * @param {string} message - human readable message
 */
export function apiErrorResponse(statusCode = 400, error = 'error', message = '') {
  return { statusCode, error, message };
}

/**
 * Send JSON error for pages API routes (req, res)
 */
export function sendApiError(res, statusCode = 400, error = 'error', message = '') {
  return res.status(statusCode).json(apiErrorResponse(statusCode, error, message));
}

/**
 * Send JSON error for app-router Route Handlers using NextResponse
 */
export function sendRouteError(status = 400, error = 'error', message = '') {
  return NextResponse.json(apiErrorResponse(status, error, message), { status });
}

/**
 * Send an SSE error event and end the stream.
 * Payload will be { statusCode, error, message } (serialized in the data: payload)
 */
export function sendSseError(res, statusCode = 400, message = '') {
  const payload = apiErrorResponse(statusCode, 'error', message);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  res.end();
}
