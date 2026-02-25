import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { verifyJWT } from "../../lib/jwt";
import { connectToMongo } from "../../adapters/database";
import { sendQrCodeEmail } from "../../adapters/email";
import { Member } from "../../lib/types";
import { ObjectId } from "mongodb";
import { AppError } from "../../lib/appError";
import { errorResponse, messageResponse, getClientIp } from "../../lib/http";
import { checkBodySize } from "../../lib/bodySize";
import { auditLog } from "../../lib/auditLog";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const token = event.headers.authorization?.split(" ")[1];

    if (!token) {
        return errorResponse(event, 401, "NO_TOKEN_PROVIDED");
    }

    const bodySizeRes = checkBodySize(event);
    if (bodySizeRes) return bodySizeRes;

    try {
        const payload = verifyJWT(token) as { sub?: string };
        const actor = payload?.sub;

        let { id } = JSON.parse(event.body || "{}");
        const trimmedId = id?.trim() ?? "";

        if (!trimmedId) {
            return errorResponse(event, 400, "MEMBER_ID_REQUIRED");
        }

        if (!ObjectId.isValid(trimmedId)) {
             return errorResponse(event, 400, "INVALID_MEMBER_ID_FORMAT");
        }

        const db = await connectToMongo();
        const membersCollection = db.collection<Member>("members");
        const memberId = ObjectId.createFromHexString(trimmedId) as any;
        const member = await membersCollection.findOne({ _id: memberId });

        if (!member) {
            return errorResponse(event, 404, "MEMBER_NOT_FOUND");
        }

        const newQrUuid = crypto.randomUUID();

        await membersCollection.updateOne(
            { _id: memberId },
            { $set: { qrUuid: newQrUuid } }
        );

        let emailSent = false;
        const senderEmail = process.env.SES_SENDER_EMAIL;
        if (senderEmail) {
            const { success } = await sendQrCodeEmail(
                senderEmail,
                member.firstName,
                member.lastName,
                member.email,
                newQrUuid
            );

            if (success) {
                emailSent = true;
                await membersCollection.updateOne(
                    { _id: memberId },
                    { $set: { emailValid: true } }
                );
            }
        }

        await auditLog({
            at: new Date(),
            action: "member_reset_qr",
            actor,
            resourceType: "member",
            resourceId: trimmedId,
            ip: getClientIp(event),
        });
        return messageResponse(event, 200, "QR_CODE_RESET_SUCCESS", undefined, {
            success: true,
            qrUuid: newQrUuid,
            emailSent
        });

    } catch (error) {
        if (error instanceof AppError && error.code === "INVALID_TOKEN") {
            return errorResponse(event, 401, "INVALID_TOKEN");
        }
        return errorResponse(event, 500, "INTERNAL_SERVER_ERROR");
    }
}