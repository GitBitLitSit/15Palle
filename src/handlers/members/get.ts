import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { verifyJWT } from "../../lib/jwt";
import { connectToMongo } from "../../adapters/database";
import { Member } from "../../lib/types";
import { AppError } from "../../lib/appError";
import { errorResponse } from "../../lib/http";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const token = event.headers.authorization?.split(" ")[1];

    if (!token) {
        return errorResponse(event, 401, "NO_TOKEN_PROVIDED");
    }

    try {
        verifyJWT(token);

        const queryParams = event.queryStringParameters || {};
        const MAX_SEARCH_LENGTH = 100;
        const MAX_LIMIT = 100;
        const DEFAULT_LIMIT = 20;

        const rawSearch = queryParams.search?.trim() || "";
        const search = rawSearch.slice(0, MAX_SEARCH_LENGTH);
        const page = Math.max(1, parseInt(queryParams.page || "1", 10) || 1);
        const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(queryParams.limit || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
        const statusFilter = (queryParams.status || "all").toLowerCase();

        const db = await connectToMongo();
        const collection = db.collection<Member>("members");

        let dbQuery: Record<string, unknown> = {};

        // Filter by text search (escape regex special chars to avoid ReDoS)
        if (search) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(escaped, "i");
            dbQuery.$or = [
                { firstName: regex },
                { lastName: regex },
                { email: regex },
            ];
        }

        // Filter by status: active | blocked | pending | invalid | all
        const notBlocked = { $or: [{ blocked: false }, { blocked: { $exists: false } }] };
        const notInvalid = { $or: [{ emailInvalid: false }, { emailInvalid: { $exists: false } }] };
        if (statusFilter === "active") {
            dbQuery = { ...dbQuery, $and: [notBlocked, notInvalid, { emailValid: true }] };
        } else if (statusFilter === "blocked") {
            dbQuery.blocked = true;
        } else if (statusFilter === "pending") {
            dbQuery = { ...dbQuery, $and: [notBlocked, notInvalid, { emailValid: false }] };
        } else if (statusFilter === "invalid") {
            dbQuery.emailInvalid = true;
        }

        const skip = (page - 1) * limit;

        // Global stats (unfiltered by status/search)
        const activeQuery = { $and: [notBlocked, notInvalid, { emailValid: true }] };
        const pendingQuery = { $and: [notBlocked, notInvalid, { emailValid: false }] };
        const [members, total, totalActive, totalBlocked, totalPending, totalInvalid] = await Promise.all([
            collection.find(dbQuery)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            collection.countDocuments(dbQuery),
            collection.countDocuments(activeQuery),
            collection.countDocuments({ blocked: true }),
            collection.countDocuments(pendingQuery),
            collection.countDocuments({ emailInvalid: true }),
        ]);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                data: members,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
                stats: {
                    total: totalActive + totalBlocked + totalPending + totalInvalid,
                    active: totalActive,
                    blocked: totalBlocked,
                    pending: totalPending,
                    invalid: totalInvalid,
                },
            }),
        };
    } catch (error) {
        if (error instanceof AppError && error.code === "INVALID_TOKEN") {
            return errorResponse(event, 401, "INVALID_TOKEN");
        }
        return errorResponse(event, 500, "INTERNAL_SERVER_ERROR");
    }
}