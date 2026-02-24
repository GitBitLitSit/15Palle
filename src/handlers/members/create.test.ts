import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiEvent, parseBody } from "../../test/eventHelper";
import { createMockDb } from "../../test/mockDb";
import { generateJWT } from "../../lib/jwt";

const mockDb = createMockDb();
const sendQrCodeEmailMock = vi.fn();

vi.mock("../../adapters/database", () => ({ connectToMongo: () => Promise.resolve(mockDb) }));
vi.mock("../../adapters/email", () => ({
  sendQrCodeEmail: (...args: any[]) => sendQrCodeEmailMock(...args),
}));

const { handler } = await import("./create");

function getToken() {
  return generateJWT("admin");
}

describe("POST /members", () => {
  beforeEach(() => {
    mockDb.members._data.length = 0;
    sendQrCodeEmailMock.mockReset();
    sendQrCodeEmailMock.mockResolvedValue({ success: true });
  });

  it("returns 401 without token", async () => {
    const event = createApiEvent({
      method: "POST",
      body: { firstName: "A", lastName: "B", email: "a@b.com", sendEmail: false },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(401);
    expect(parseBody(res).error).toBe("NO_TOKEN_PROVIDED");
  });

  it("returns 400 when required fields missing", async () => {
    const event = createApiEvent({
      method: "POST",
      headers: { authorization: `Bearer ${getToken()}` },
      body: { firstName: "A", lastName: "B" },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(400);
    expect(parseBody(res).error).toBe("MEMBER_REQUIRED");
  });

  it("returns 400 for invalid email format", async () => {
    const event = createApiEvent({
      method: "POST",
      headers: { authorization: `Bearer ${getToken()}` },
      body: { firstName: "A", lastName: "B", email: "not-an-email", sendEmail: false },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(400);
    expect(parseBody(res).error).toBe("INVALID_EMAIL_FORMAT");
  });

  it("creates member and returns 201 without sending email when sendEmail false", async () => {
    const event = createApiEvent({
      method: "POST",
      headers: { authorization: `Bearer ${getToken()}` },
      body: { firstName: "Mario", lastName: "Rossi", email: "mario@test.com", sendEmail: false },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(201);
    const body = parseBody(res);
    expect(body.message).toBe("MEMBER_CREATED");
    expect(body.memberId).toBeDefined();
    expect(sendQrCodeEmailMock).not.toHaveBeenCalled();
    expect(mockDb.members._data).toHaveLength(1);
    expect((mockDb.members._data[0] as any).email).toBe("mario@test.com");
  });

  it("creates member and sends QR email when sendEmail true", async () => {
    const event = createApiEvent({
      method: "POST",
      headers: { authorization: `Bearer ${getToken()}` },
      body: { firstName: "Luigi", lastName: "Verdi", email: "luigi@test.com", sendEmail: true },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(201);
    const body = parseBody(res);
    expect(body.message).toBe("MEMBER_CREATED_EMAIL_SUCCESS");
    expect(sendQrCodeEmailMock).toHaveBeenCalledTimes(1);
    expect(sendQrCodeEmailMock).toHaveBeenCalledWith(
      process.env.SES_SENDER_EMAIL,
      "Luigi",
      "Verdi",
      "luigi@test.com",
      expect.any(String)
    );
  });

  it("returns 409 when email already exists", async () => {
    await mockDb.members.insertOne({
      firstName: "Existing",
      lastName: "User",
      email: "existing@test.com",
      createdAt: new Date(),
      blocked: false,
      qrUuid: "uuid-1",
      emailValid: false,
    } as any);
    const event = createApiEvent({
      method: "POST",
      headers: { authorization: `Bearer ${getToken()}` },
      body: { firstName: "New", lastName: "User", email: "existing@test.com", sendEmail: false },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(409);
    expect(parseBody(res).error).toBe("MEMBER_EMAIL_EXISTS");
  });
});
