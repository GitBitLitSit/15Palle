import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiEvent, parseBody } from "../../test/eventHelper";
import { createMockDb } from "../../test/mockDb";
import { generateJWT } from "../../lib/jwt";
import { ObjectId } from "mongodb";

const mockDb = createMockDb();
vi.mock("../../adapters/database", () => ({ connectToMongo: () => Promise.resolve(mockDb) }));

const { handler } = await import("./get");

describe("GET /members", () => {
  beforeEach(() => {
    mockDb.members._data.length = 0;
    (mockDb.checkins as any).distinct = vi.fn().mockResolvedValue([]);
  });

  it("returns 401 without token", async () => {
    const event = createApiEvent({ method: "GET", path: "/members" });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(401);
    expect(parseBody(res).error).toBe("NO_TOKEN_PROVIDED");
  });

  it("returns 200 with paginated members", async () => {
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
      path: "/members",
      headers: { authorization: `Bearer ${token}` },
      queryStringParameters: { page: "1", limit: "20" },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.pagination.total).toBe(1);
  });

  it("filters by activity using successful check-ins of the last 30 days", async () => {
    const activeId = new ObjectId();
    const distinct = vi.fn().mockResolvedValue([activeId]);
    (mockDb.checkins as any).distinct = distinct;
    const find = vi.spyOn(mockDb.members, "find");
    const token = generateJWT("admin");
    let lastBody: any;
    for (const activity of ["active", "inactive"]) {
      const res = await handler(createApiEvent({
        method: "GET",
        path: "/members",
        headers: { authorization: `Bearer ${token}` },
        queryStringParameters: { activity },
      }), {} as any, () => {});
      expect(res?.statusCode).toBe(200);
      lastBody = parseBody(res);
    }
    const idFilters = find.mock.calls.map((c) => c[0]?._id);
    expect(idFilters).toContainEqual({ $in: [activeId] });
    expect(idFilters).toContainEqual({ $nin: [activeId] });
    const since: Date = distinct.mock.calls[0][1].checkInTime.$gte;
    expect(Date.now() - since.getTime()).toBeCloseTo(30 * 24 * 60 * 60 * 1000, -4);
    expect(typeof lastBody.stats.recentlyActive).toBe("number");
    find.mockRestore();
  });

  it("finds member when search is full first and last name", async () => {
    await mockDb.members.insertOne({
      firstName: "Mario",
      lastName: "Rossi",
      email: "mario@example.com",
      createdAt: new Date(),
      blocked: false,
      qrUuid: "q2",
      emailValid: true,
    } as any);
    const token = generateJWT("admin");
    const event = createApiEvent({
      method: "GET",
      path: "/members",
      headers: { authorization: `Bearer ${token}` },
      queryStringParameters: { page: "1", limit: "20", search: "Mario Rossi" },
    });
    const res = await handler(event, {} as any, () => {});
    expect(res?.statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.data.length).toBe(1);
    expect(body.data[0].lastName).toBe("Rossi");
  });
});
