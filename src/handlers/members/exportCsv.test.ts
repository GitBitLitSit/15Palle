import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiEvent, parseBody } from "../../test/eventHelper";
import { createMockDb } from "../../test/mockDb";
import { generateJWT } from "../../lib/jwt";

const mockDb = createMockDb();
vi.mock("../../adapters/database", () => ({ connectToMongo: () => Promise.resolve(mockDb) }));

const { handler } = await import("./exportCsv");

describe("GET /members/export", () => {
  beforeEach(() => {
    mockDb.members._data.length = 0;
  });

  it("returns 401 without token", async () => {
    const event = createApiEvent({ method: "GET", path: "/members/export" });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(401);
  });

  it("returns 200 with csv body", async () => {
    await mockDb.members.insertOne({
      firstName: "A",
      lastName: "B",
      email: "a@b.com",
      createdAt: new Date(),
      blocked: false,
      qrUuid: "q1",
      emailValid: false,
    } as any);
    const token = generateJWT("admin");
    const event = createApiEvent({
      method: "GET",
      path: "/members/export",
      headers: { authorization: `Bearer ${token}` },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(200);
    expect(res?.headers?.["content-type"]).toContain("text/csv");
    expect(res?.body).toContain("firstName");
    expect(res?.body).toContain("a@b.com");
  });
});
