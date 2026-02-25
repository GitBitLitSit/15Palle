import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { connectToMongo } from "../../adapters/database";
import { verifyJWT } from "../../lib/jwt";
import { sendQrCodeEmail } from "../../adapters/email";
import { MongoServerError } from "mongodb";
import { Member } from "../../lib/types";
import { AppError } from "../../lib/appError";
import { errorResponse, messageResponse, getClientIp } from "../../lib/http";
import { checkBodySize } from "../../lib/bodySize";
import { auditLog } from "../../lib/auditLog";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const token = event.headers.authorization?.split(" ")[1];
    if(!token) {
        return errorResponse(event, 401, "NO_TOKEN_PROVIDED");
    }

    const bodySizeRes = checkBodySize(event);
    if (bodySizeRes) return bodySizeRes;

    try {
        const payload = verifyJWT(token) as { sub?: string };
        const actor = payload?.sub;

        let { firstName, lastName, email, sendEmail } = JSON.parse(event.body || "{}");
        const trimmedFirstName = firstName?.trim() ?? "";
        const trimmedLastName = lastName?.trim() ?? "";
        const trimmedEmail = (email?.trim() ?? "").toLowerCase();

        if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || typeof sendEmail !== "boolean") {
            return errorResponse(event, 400, "MEMBER_REQUIRED");
        } else if (trimmedEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) === null) {
            return errorResponse(event, 400, "INVALID_EMAIL_FORMAT");
        }

        const db = await connectToMongo();
        const collection = db.collection<Member>("members");

        const qrUuid = crypto.randomUUID();
        const newMember: Member = {
            firstName: trimmedFirstName,
            lastName: trimmedLastName,
            email: trimmedEmail,
            createdAt: new Date(),
            blocked: false,
            qrUuid: qrUuid,
            emailValid: false,
        }

        const result = await collection.insertOne(newMember);
        await auditLog({
            at: new Date(),
            action: "member_create",
            actor,
            resourceType: "member",
            resourceId: String(result.insertedId),
            ip: getClientIp(event),
        });

        if (sendEmail) {
            const { success, error } = await sendQrCodeEmail(process.env.SES_SENDER_EMAIL!, trimmedFirstName, trimmedLastName, trimmedEmail, qrUuid);

            if (success) {
                await collection.updateOne(
                    { _id: result.insertedId },
                    { $set: { emailValid: true } }
                );

                return messageResponse(event, 201, "MEMBER_CREATED_EMAIL_SUCCESS", undefined, { memberId: result.insertedId });
            } else {
                return messageResponse(event, 201, "MEMBER_CREATED_EMAIL_FAILED", undefined, { memberId: result.insertedId });
            }
        }

        return messageResponse(event, 201, "MEMBER_CREATED", undefined, { memberId: result.insertedId });
    } catch (error) {
        // Email already exists
        if (error instanceof MongoServerError && error.code === 11000) {
            return errorResponse(event, 409, "MEMBER_EMAIL_EXISTS");
        }

        // JWT verification error
        if (error instanceof AppError && error.code === "INVALID_TOKEN") {
            return errorResponse(event, 401, "INVALID_TOKEN");
        }

        // Generic error
        return errorResponse(event, 500, "INTERNAL_SERVER_ERROR");
    }
}