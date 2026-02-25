import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { errorResponse } from "./http";

/** Default max body size: 1MB */
const DEFAULT_MAX_BYTES = 1024 * 1024;

/**
 * Enforce max request body size. Returns 413 response if body exceeds limit.
 * Call before parsing event.body in POST/PUT handlers.
 */
export function checkBodySize(
  event: APIGatewayProxyEventV2,
  maxBytes: number = DEFAULT_MAX_BYTES
): APIGatewayProxyResultV2 | null {
  const raw = event.body;
  if (!raw) return null;

  const length =
    event.isBase64Encoded
      ? Buffer.byteLength(Buffer.from(raw, "base64"))
      : Buffer.byteLength(raw, "utf8");

  if (length > maxBytes) {
    return errorResponse(event, 413, "REQUEST_BODY_TOO_LARGE");
  }
  return null;
}
