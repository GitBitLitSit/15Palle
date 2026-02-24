import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiEvent, parseBody } from "../../test/eventHelper";
import { createMockDb } from "../../test/mockDb";
import { generateJWT } from "../../lib/jwt";
import { ObjectId } from "mongodb";

const mockDb = createMockDb();
vi.mock("../../adapters/database", () => ({ connectToMongo: () => Promise.resolve(mockDb) }));

const { handler } = await import("./delete");

describe("DELETE /members/:id", () => {
  beforeEach(() => {
    mockDb.members._data.length = 0;
  });

  it("returns 401 without token", async () => {
    const event = createApiEvent({ method: "DELETE", pathParameters: { id: new ObjectId().toString() } });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(401);
  });

  it("returns 404 when member not found", async () => {
    const token = generateJWT("admin");
    const event = createApiEvent({
      method: "DELETE",
      pathParameters: { id: new ObjectId().toString() },
      headers: { authorization: `Bearer ${token}` },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(404);
    expect(parseBody(res).error).toBe("MEMBER_NOT_FOUND");
  });

  it("returns 200 and deletes member", async () => {
    const id = new ObjectId();
    await mockDb.members.insertOne({
      _id: id,
      firstName: "Del",
      lastName: "Me",
      email: "del@test.com",
      createdAt: new Date(),
      blocked: false,
      qrUuid: "qr-del",
      emailValid: false,
    } as any);
    const token = generateJWT("admin");
    const event = createApiEvent({
      method: "DELETE",
      pathParameters: { id: id.toString() },
      headers: { authorization: `Bearer ${token}` },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(200);
    expect(mockDb.members._data).toHaveLength(0);
  });
});
