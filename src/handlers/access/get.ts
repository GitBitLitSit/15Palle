import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { verifyJWT } from "../../lib/jwt";
import { connectToMongo } from "../../adapters/database";
import { AppError } from "../../lib/appError";
import { errorResponse, json } from "../../lib/http";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const token = event.headers.authorization?.split(" ")[1];

    if (!token) {
        return errorResponse(event, 401, "NO_TOKEN_PROVIDED");
    }

    try {
        verifyJWT(token);

        const queryParams = event.queryStringParameters || {};
        const MAX_LIMIT = 100;
        const DEFAULT_LIMIT = 50;
        const page = Math.max(1, parseInt(queryParams.page || "1", 10) || 1);
        const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(queryParams.limit || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
        const skip = (page - 1) * limit;
        const status = (queryParams.status || "all").toLowerCase();
        const statusFilter = status === "success" || status === "failure" ? status : "all";

        const db = await connectToMongo();
        const collection = db.collection("checkins");

        const matchStage =
            statusFilter === "success"
                ? { $match: { $and: [{ $or: [{ warning: { $in: [null, ""] } }, { warning: { $exists: false } }] }, { $or: [{ warningCode: { $in: [null, ""] } }, { warningCode: { $exists: false } }] }] } }
                : statusFilter === "failure"
                    ? { $match: { $or: [{ warning: { $exists: true, $nin: [null, ""] } }, { warningCode: { $exists: true, $nin: [null, ""] } }] } }
                    : null;

        const pipeline: object[] = [];
        if (matchStage) pipeline.push(matchStage);
        pipeline.push(
            { $sort: { checkInTime: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: "members",
                    localField: "memberId",
                    foreignField: "_id",
                    as: "memberData"
                }
            },
            { $unwind: { path: "$memberData", preserveNullAndEmptyArrays: true } },
            { $addFields: { member: "$memberData" } },
            { $project: { memberData: 0 } }
        );

        const countPipeline: object[] = [];
        if (matchStage) countPipeline.push(matchStage);
        countPipeline.push({ $count: "total" });
        const countResult = await collection.aggregate(countPipeline).toArray();
        const total = countResult[0]?.total ?? 0;

        const checkIns = await collection.aggregate(pipeline).toArray();

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                data: checkIns,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                }
            }),
        };
    } catch (error) {
        if (error instanceof AppError && error.code === "INVALID_TOKEN") {
            return errorResponse(event, 401, "INVALID_TOKEN");
        }
        return errorResponse(event, 500, "INTERNAL_SERVER_ERROR");
    }
}