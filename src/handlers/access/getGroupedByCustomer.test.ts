import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { createApiEvent, parseBody } from "../../test/eventHelper";
import { generateJWT } from "../../lib/jwt";

const aggregateMock = vi.fn();
const aggregateToArrayResult = { rows: [] as unknown[] };

vi.mock("../../adapters/database", () => ({
    connectToMongo: () =>
        Promise.resolve({
            collection: () => ({
                aggregate: (...args: unknown[]) => {
                    aggregateMock(...args);
                    return { toArray: () => Promise.resolve(aggregateToArrayResult.rows) };
                },
            }),
        }),
}));

const { handler } = await import("./getGroupedByCustomer");

describe("GET /auth/check-ins/by-customer", () => {
    beforeEach(() => {
        aggregateMock.mockReset();
        aggregateToArrayResult.rows = [];
    });

    it("returns 401 without token", async () => {
        const event = createApiEvent({ method: "GET", path: "/auth/check-ins/by-customer" });
        const res = await handler(event, {} as any, () => {});
        expect(res?.statusCode).toBe(401);
    });

    it("returns 400 when from is missing", async () => {
        const token = generateJWT("admin");
        const event = createApiEvent({
            method: "GET",
            path: "/auth/check-ins/by-customer",
            headers: { authorization: `Bearer ${token}` },
            queryStringParameters: {},
        });
        const res = await handler(event, {} as any, () => {});
        expect(res?.statusCode).toBe(400);
        const body = parseBody(res);
        expect(body.error).toBe("CHECKINS_PERIOD_FROM_REQUIRED");
    });

    it("returns 200 with serialized rows", async () => {
        const memberId = new ObjectId();
        const checkInId = new ObjectId();
        const t1 = new Date("2024-06-10T12:00:00.000Z");
        const t2 = new Date("2024-06-09T10:00:00.000Z");

        aggregateToArrayResult.rows = [
            {
                _id: memberId,
                member: {
                    _id: memberId,
                    firstName: "Ada",
                    lastName: "Lovelace",
                    email: "ada@example.com",
                    createdAt: new Date("2024-01-01T00:00:00.000Z"),
                    blocked: false,
                    qrUuid: "qr-1",
                    emailValid: true,
                },
                checkIns: [
                    { _id: checkInId, checkInTime: t1, source: "raspberry_pi" },
                    { _id: new ObjectId(), checkInTime: t2, source: "raspberry_pi" },
                ],
                latestCheckInTime: t1,
            },
        ];

        const token = generateJWT("admin");
        const event = createApiEvent({
            method: "GET",
            path: "/auth/check-ins/by-customer",
            headers: { authorization: `Bearer ${token}` },
            queryStringParameters: {
                from: "2024-06-01T00:00:00.000Z",
                to: "2024-06-30T23:59:59.999Z",
            },
        });

        const res = await handler(event, {} as any, () => {});
        expect(res?.statusCode).toBe(200);
        const body = parseBody(res);
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].memberId).toBe(String(memberId));
        expect(body.data[0].member.email).toBe("ada@example.com");
        expect(body.data[0].checkIns).toHaveLength(2);
        expect(body.data[0].checkIns[0].checkInTime).toBe(t1.toISOString());
        expect(aggregateMock).toHaveBeenCalledTimes(1);
    });
});
