import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { createApiEvent, parseBody } from "../../test/eventHelper";
import { createMockDb } from "../../test/mockDb";
import { generateJWT } from "../../lib/jwt";

const mockDb = createMockDb();
vi.mock("../../adapters/database", () => ({ connectToMongo: () => Promise.resolve(mockDb) }));
vi.mock("../../adapters/notification", () => ({ broadcastToDashboard: () => Promise.resolve() }));

const { handler } = await import("./checkIn");

describe("POST /check-in", () => {
  beforeEach(() => {
    mockDb.members._data.length = 0;
    mockDb.checkins._data.length = 0;
  });

  it("returns 401 without credentials", async () => {
    const event = createApiEvent({ method: "POST", body: { qrUuid: "some-qr" } });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(401);
  });

  it("returns 400 when qrUuid missing", async () => {
    const token = generateJWT("admin");
    const event = createApiEvent({
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: {},
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(400);
    expect(parseBody(res).error).toBe("QRUUID_REQUIRED");
  });

  it("returns 404 for unknown qrUuid", async () => {
    const token = generateJWT("admin");
    const event = createApiEvent({
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: { qrUuid: "unknown-qr" },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(404);
  });

  it("returns 200 and records check-in for valid qrUuid", async () => {
    const member = await mockDb.members.insertOne({
      firstName: "Check",
      lastName: "In",
      email: "check@test.com",
      createdAt: new Date(),
      blocked: false,
      qrUuid: "valid-qr",
      emailValid: false,
    } as any);
    const token = generateJWT("admin");
    const event = createApiEvent({
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: { qrUuid: "valid-qr" },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.success).toBe(true);
    expect(body.member?.email).toBe("check@test.com");
  });

  it("returns 200 with success false when same member scans within 5 min cooldown", async () => {
    const memberId = new ObjectId();
    await mockDb.members.insertOne({
      _id: memberId,
      firstName: "Check",
      lastName: "In",
      email: "check@test.com",
      createdAt: new Date(),
      blocked: false,
      qrUuid: "valid-qr",
      emailValid: false,
    } as any);
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    await mockDb.checkins.insertOne({
      memberId,
      checkInTime: twoMinutesAgo,
      source: "raspberry_pi",
      warning: null,
      warningCode: null,
    } as any);
    const token = generateJWT("admin");
    const event = createApiEvent({
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: { qrUuid: "valid-qr" },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.success).toBe(false);
    expect(body.message).toBeDefined();
  });
});
