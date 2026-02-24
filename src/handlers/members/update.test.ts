import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiEvent, parseBody } from "../../test/eventHelper";
import { createMockDb } from "../../test/mockDb";
import { generateJWT } from "../../lib/jwt";
import { ObjectId } from "mongodb";

const mockDb = createMockDb();
const sendQrCodeEmailMock = vi.fn();
vi.mock("../../adapters/database", () => ({ connectToMongo: () => Promise.resolve(mockDb) }));
vi.mock("../../adapters/email", () => ({ sendQrCodeEmail: (...args: any[]) => sendQrCodeEmailMock(...args) }));

const { handler } = await import("./update");

describe("PUT /members/:id", () => {
  beforeEach(() => {
    mockDb.members._data.length = 0;
    sendQrCodeEmailMock.mockResolvedValue({ success: true });
  });

  it("returns 401 without token", async () => {
    const event = createApiEvent({
      method: "PUT",
      pathParameters: { id: new ObjectId().toString() },
      body: { firstName: "A", lastName: "B", email: "a@b.com", blocked: false },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(401);
  });

  it("returns 404 when member not found", async () => {
    const token = generateJWT("admin");
    const event = createApiEvent({
      method: "PUT",
      pathParameters: { id: new ObjectId().toString() },
      headers: { authorization: `Bearer ${token}` },
      body: { firstName: "A", lastName: "B", email: "a@b.com", blocked: false },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(404);
  });

  it("returns 200 and updates member", async () => {
    const id = new ObjectId();
    await mockDb.members.insertOne({
      _id: id,
      firstName: "Old",
      lastName: "Name",
      email: "old@test.com",
      createdAt: new Date(),
      blocked: false,
      qrUuid: "qr-1",
      emailValid: false,
    } as any);
    const token = generateJWT("admin");
    const event = createApiEvent({
      method: "PUT",
      pathParameters: { id: id.toString() },
      headers: { authorization: `Bearer ${token}` },
      body: { firstName: "New", lastName: "Name", email: "old@test.com", blocked: false },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.member?.firstName).toBe("New");
  });
});
