import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiEvent, parseBody } from "../../test/eventHelper";
import { createMockDb } from "../../test/mockDb";
import { ObjectId } from "mongodb";

const mockDb = createMockDb();
const sendQrCodeEmailMock = vi.fn();
vi.mock("../../adapters/database", () => ({ connectToMongo: () => Promise.resolve(mockDb) }));
vi.mock("../../adapters/email", () => ({ sendQrCodeEmail: (...args: any[]) => sendQrCodeEmailMock(...args) }));

const { handler } = await import("./recover");

describe("POST /members/recover", () => {
  beforeEach(() => {
    mockDb.members._data.length = 0;
    mockDb.emailVerifications._data.length = 0;
    sendQrCodeEmailMock.mockResolvedValue(undefined);
  });

  it("returns 400 when email or code missing", async () => {
    const event = createApiEvent({ method: "POST", body: { email: "a@b.com" } });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(400);
    expect(parseBody(res).error).toBe("EMAIL_AND_CONFIRMATION_CODE");
  });

  it("returns 404 when member not found", async () => {
    const event = createApiEvent({
      method: "POST",
      body: { email: "none@test.com", verificationCode: "123456", deliveryMethod: "display" },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(404);
  });

  it("returns 200 with qrImage when deliveryMethod is display", async () => {
    const memberId = new ObjectId();
    await mockDb.members.insertOne({
      _id: memberId,
      firstName: "Rec",
      lastName: "User",
      email: "rec@test.com",
      createdAt: new Date(),
      blocked: false,
      qrUuid: "qr-recover",
      emailValid: false,
    } as any);
    await mockDb.emailVerifications.insertOne({
      memberId,
      verificationCode: "123456",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    } as any);
    const event = createApiEvent({
      method: "POST",
      body: { email: "rec@test.com", verificationCode: "123456", deliveryMethod: "display" },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.success).toBe(true);
    expect(body.qrImage).toBeDefined();
    expect(sendQrCodeEmailMock).not.toHaveBeenCalled();
  });

  it("sends QR email when deliveryMethod is email", async () => {
    const memberId = new ObjectId();
    await mockDb.members.insertOne({
      _id: memberId,
      firstName: "Mail",
      lastName: "User",
      email: "mail@test.com",
      createdAt: new Date(),
      blocked: false,
      qrUuid: "qr-mail",
      emailValid: false,
    } as any);
    await mockDb.emailVerifications.insertOne({
      memberId,
      verificationCode: "654321",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    } as any);
    const event = createApiEvent({
      method: "POST",
      body: { email: "mail@test.com", verificationCode: "654321", deliveryMethod: "email" },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(200);
    expect(sendQrCodeEmailMock).toHaveBeenCalledWith(
      process.env.SES_SENDER_EMAIL,
      "Mail",
      "User",
      "mail@test.com",
      "qr-mail"
    );
  });
});
