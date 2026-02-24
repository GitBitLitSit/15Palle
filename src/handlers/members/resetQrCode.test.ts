import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiEvent, parseBody } from "../../test/eventHelper";
import { createMockDb } from "../../test/mockDb";
import { generateJWT } from "../../lib/jwt";
import { ObjectId } from "mongodb";

const mockDb = createMockDb();
const sendQrCodeEmailMock = vi.fn();
vi.mock("../../adapters/database", () => ({ connectToMongo: () => Promise.resolve(mockDb) }));
vi.mock("../../adapters/email", () => ({ sendQrCodeEmail: (...args: any[]) => sendQrCodeEmailMock(...args) }));

const { handler } = await import("./resetQrCode");

describe("POST /members/reset-qrcode", () => {
  beforeEach(() => {
    mockDb.members._data.length = 0;
    sendQrCodeEmailMock.mockResolvedValue({ success: true });
  });

  it("returns 401 without token", async () => {
    const event = createApiEvent({
      method: "POST",
      body: { id: new ObjectId().toString() },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(401);
  });

  it("returns 404 when member not found", async () => {
    const token = generateJWT("admin");
    const event = createApiEvent({
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: { id: new ObjectId().toString() },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(404);
  });

  it("returns 200 and resets qrUuid", async () => {
    const id = new ObjectId();
    await mockDb.members.insertOne({
      _id: id,
      firstName: "Q",
      lastName: "R",
      email: "qr@test.com",
      createdAt: new Date(),
      blocked: false,
      qrUuid: "old-qr",
      emailValid: false,
    } as any);
    const token = generateJWT("admin");
    const event = createApiEvent({
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: { id: id.toString() },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.success).toBe(true);
    expect(body.qrUuid).toBeDefined();
    expect(body.qrUuid).not.toBe("old-qr");
    expect(sendQrCodeEmailMock).toHaveBeenCalled();
  });
});
