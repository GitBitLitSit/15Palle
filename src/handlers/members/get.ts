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
        const showBlockedOnly = queryParams.blocked === "true";

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

        // Filter by blocked status
        if (showBlockedOnly) {
            dbQuery.blocked = true;
        }

        const skip = (page - 1) * limit;

        // Global stats for dashboard (unfiltered by blocked/search)
        const [members, total, totalActive, totalBlocked] = await Promise.all([
            collection.find(dbQuery)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            collection.countDocuments(dbQuery),
            collection.countDocuments({ $or: [{ blocked: false }, { blocked: { $exists: false } }] }),
            collection.countDocuments({ blocked: true }),
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
                    total: totalActive + totalBlocked,
                    active: totalActive,
                    blocked: totalBlocked,
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