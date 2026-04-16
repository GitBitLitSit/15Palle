import type { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import { verifyJWT } from "../../lib/jwt";
import { connectToMongo } from "../../adapters/database";
import { AppError } from "../../lib/appError";
import { errorResponse, json } from "../../lib/http";

function mergeQueryParams(event: APIGatewayProxyEventV2) {
    const queryParams = event.queryStringParameters || {};
    const rawQuery = event.rawQueryString || "";
    const paramsFromRaw = Object.fromEntries(
        rawQuery
            .split("&")
            .filter((pair) => pair.includes("="))
            .map((pair) => {
                const eq = pair.indexOf("=");
                const k = decodeURIComponent(pair.slice(0, eq)).trim();
                const v = decodeURIComponent(pair.slice(eq + 1)).trim();
                return [k, v] as const;
            })
            .filter(([k]) => k !== "")
    );
    return { ...paramsFromRaw, ...queryParams };
}

/** Same semantics as GET /auth/check-ins?status=success */
const successMatchStage = {
    $match: {
        $and: [
            { $or: [{ warning: { $in: [null, ""] } }, { warning: { $exists: false } }] },
            { $or: [{ warningCode: { $in: [null, ""] } }, { warningCode: { $exists: false } }] },
        ],
    },
};

function toIso(d: unknown): string | null {
    if (!d) return null;
    if (d instanceof Date) return d.toISOString();
    if (typeof d === "string") return d;
    return null;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const token = event.headers.authorization?.split(" ")[1];

    if (!token) {
        return errorResponse(event, 401, "NO_TOKEN_PROVIDED");
    }

    try {
        verifyJWT(token);

        const merged = mergeQueryParams(event);
        const fromRaw = (merged.from || "").trim();
        const toRaw = (merged.to || "").trim();

        if (!fromRaw) {
            return errorResponse(event, 400, "CHECKINS_PERIOD_FROM_REQUIRED");
        }

        const fromDate = new Date(fromRaw);
        const toDate = toRaw ? new Date(toRaw) : new Date();

        if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
            return errorResponse(event, 400, "CHECKINS_PERIOD_INVALID_DATES");
        }

        if (fromDate.getTime() > toDate.getTime()) {
            return errorResponse(event, 400, "CHECKINS_PERIOD_INVALID_RANGE");
        }

        const db = await connectToMongo();
        const collection = db.collection("checkins");

        const pipeline: object[] = [
            successMatchStage,
            {
                $match: {
                    memberId: { $ne: null },
                    checkInTime: { $gte: fromDate, $lte: toDate },
                },
            },
            {
                $lookup: {
                    from: "members",
                    localField: "memberId",
                    foreignField: "_id",
                    as: "memberData",
                },
            },
            { $match: { memberData: { $ne: [] } } },
            { $set: { member: { $arrayElemAt: ["$memberData", 0] } } },
            { $unset: ["memberData"] },
            { $sort: { checkInTime: -1 } },
            {
                $group: {
                    _id: "$memberId",
                    member: { $first: "$member" },
                    checkIns: {
                        $push: {
                            checkInTime: "$checkInTime",
                            source: "$source",
                            _id: "$_id",
                        },
                    },
                },
            },
            {
                $set: {
                    latestCheckInTime: {
                        $let: {
                            vars: { first: { $arrayElemAt: ["$checkIns", 0] } },
                            in: "$$first.checkInTime",
                        },
                    },
                },
            },
            { $sort: { latestCheckInTime: -1 } },
        ];

        const rows = await collection.aggregate(pipeline).toArray();

        const data = rows.map((row: any) => {
            const m = row.member;
            const member =
                m && typeof m === "object"
                    ? {
                          _id: m._id != null ? String(m._id) : "",
                          firstName: String(m.firstName ?? ""),
                          lastName: String(m.lastName ?? ""),
                          email: String(m.email ?? ""),
                          createdAt: toIso(m.createdAt) ?? "",
                          blocked: Boolean(m.blocked),
                          qrUuid: String(m.qrUuid ?? ""),
                          emailValid: Boolean(m.emailValid),
                          emailInvalid: m.emailInvalid === true,
                      }
                    : null;

            const checkIns = (row.checkIns as any[]).map((ci) => ({
                _id: ci._id != null ? String(ci._id) : undefined,
                checkInTime: toIso(ci.checkInTime) ?? "",
                source: ci.source != null ? String(ci.source) : "unknown",
            }));

            return {
                memberId: row._id != null ? String(row._id) : "",
                member,
                latestCheckInTime: toIso(row.latestCheckInTime) ?? "",
                checkIns,
            };
        });

        return json(200, { success: true, data });
    } catch (error) {
        if (error instanceof AppError && error.code === "INVALID_TOKEN") {
            return errorResponse(event, 401, "INVALID_TOKEN");
        }
        return errorResponse(event, 500, "INTERNAL_SERVER_ERROR");
    }
};
