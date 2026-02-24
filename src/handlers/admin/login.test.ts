import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiEvent, parseBody } from "../../test/eventHelper";
import { createMockDb } from "../../test/mockDb";
import bcrypt from "bcryptjs";

const mockDb = createMockDb();
vi.mock("../../adapters/database", () => ({ connectToMongo: () => Promise.resolve(mockDb) }));

const { handler } = await import("./login");

describe("POST /admin/login", () => {
  beforeEach(() => {
    mockDb.admins._data.length = 0;
    mockDb.failed_logins._data.length = 0;
  });

  it("returns 400 when username or password missing", async () => {
    const event = createApiEvent({ method: "POST", body: {} });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(400);
    expect(parseBody(res).error).toBe("MISSING_CREDENTIALS");
  });

  it("returns 401 for invalid credentials", async () => {
    await mockDb.admins.insertOne({
      username: "admin",
      password: await bcrypt.hash("rightpassword", 10),
      role: "owner",
    } as any);
    const event = createApiEvent({
      method: "POST",
      body: { username: "admin", password: "wrong" },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(401);
    expect(parseBody(res).error).toBe("INVALID_CREDENTIALS");
  });

  it("returns 200 and token for valid credentials", async () => {
    const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD!, 10);
    await mockDb.admins.insertOne({
      username: process.env.ADMIN_USERNAME!,
      password: hashed,
      role: "owner",
    } as any);
    const event = createApiEvent({
      method: "POST",
      body: { username: process.env.ADMIN_USERNAME!, password: process.env.ADMIN_PASSWORD! },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.message).toBe("LOGIN_SUCCESSFUL");
    expect(body.token).toBeDefined();
    expect(typeof body.token).toBe("string");
  });
});
