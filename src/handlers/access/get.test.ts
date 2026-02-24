import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiEvent, parseBody } from "../../test/eventHelper";
import { createMockDb } from "../../test/mockDb";
import { generateJWT } from "../../lib/jwt";

const mockDb = createMockDb();
vi.mock("../../adapters/database", () => ({ connectToMongo: () => Promise.resolve(mockDb) }));

const { handler } = await import("./get");

describe("GET /auth/check-ins", () => {
  beforeEach(() => {
    mockDb.checkins._data.length = 0;
  });

  it("returns 401 without token", async () => {
    const event = createApiEvent({ method: "GET", path: "/auth/check-ins" });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(401);
  });

  it("returns 200 with paginated check-ins", async () => {
    const token = generateJWT("admin");
    const event = createApiEvent({
      method: "GET",
      path: "/auth/check-ins",
      headers: { authorization: `Bearer ${token}` },
      queryStringParameters: { page: "1", limit: "50" },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeDefined();
  });
});
