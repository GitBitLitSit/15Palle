import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiEvent, parseBody } from "../../test/eventHelper";
import { createMockDb } from "../../test/mockDb";

const mockDb = createMockDb();
const sendVerificationEmailMock = vi.fn();

vi.mock("../../adapters/database", () => ({ connectToMongo: () => Promise.resolve(mockDb) }));
vi.mock("../../adapters/email", () => ({
  sendVerificationEmail: (...args: any[]) => sendVerificationEmailMock(...args),
}));

const { handler } = await import("./requestVerification");

describe("POST /auth/request-verification", () => {
  beforeEach(() => {
    mockDb.members._data.length = 0;
    mockDb.emailVerifications._data.length = 0;
    sendVerificationEmailMock.mockReset();
    sendVerificationEmailMock.mockResolvedValue(undefined);
  });

  it("returns 400 when email missing", async () => {
    const event = createApiEvent({ method: "POST", body: {} });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(400);
    expect(parseBody(res).error).toBe("EMAIL_REQUIRED");
  });

  it("returns 200 safe response when member does not exist (no leak)", async () => {
    const event = createApiEvent({ method: "POST", body: { email: "nonexistent@test.com" } });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(200);
    expect(parseBody(res).message).toBe("IF_ACCOUNT_EXISTS");
    expect(sendVerificationEmailMock).not.toHaveBeenCalled();
  });

  it("sends verification email when member exists", async () => {
    await mockDb.members.insertOne({
      firstName: "Test",
      lastName: "User",
      email: "user@test.com",
      createdAt: new Date(),
      blocked: false,
      qrUuid: "qr-1",
      emailValid: false,
    } as any);
    const event = createApiEvent({ method: "POST", body: { email: "user@test.com" } });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(200);
    expect(sendVerificationEmailMock).toHaveBeenCalledTimes(1);
    expect(sendVerificationEmailMock).toHaveBeenCalledWith(
      process.env.SES_SENDER_EMAIL,
      "user@test.com",
      expect.any(String),
      "Test"
    );
  });
});
