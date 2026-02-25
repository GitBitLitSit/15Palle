import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { connectToMongo } from "../adapters/database";
import { errorResponse } from "./http";

const WINDOW_MS = 60 * 1000; // 1 minute
const COLLECTION = "rate_limits";

export interface RateLimitOptions {
  /** Max requests per window per key (default 30) */
  maxRequests?: number;
  /** Window in ms (default 60000) */
  windowMs?: number;
}

/**
 * Check rate limit by IP (and optional key). If over limit, returns 429 response.
 * Call this at the start of sensitive handlers. Uses MongoDB for cross-invocation state.
 */
export async function checkRateLimit(
  event: APIGatewayProxyEventV2,
  keyPrefix: string,
  options: RateLimitOptions = {}
): Promise<APIGatewayProxyResultV2 | null> {
  const { maxRequests = 30, windowMs = WINDOW_MS } = options;
  const ip = event.requestContext?.http?.sourceIp ?? "unknown";
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const db = await connectToMongo();
  const coll = db.collection(COLLECTION);

  const doc = await coll.findOne({ _id: key });
  const timestamps: number[] = doc?.timestamps ?? [];
  const recent = timestamps.filter((t) => t > windowStart);

  if (recent.length >= maxRequests) {
    return errorResponse(event, 429, "RATE_LIMIT_EXCEEDED");
  }

  recent.push(now);
  await coll.updateOne(
    { _id: key },
    { $set: { timestamps: recent, updatedAt: new Date() } },
    { upsert: true }
  );

  return null;
}
