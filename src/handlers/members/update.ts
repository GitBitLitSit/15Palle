import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { verifyJWT } from "../../lib/jwt";
import { connectToMongo } from "../../adapters/database";
import { sendQrCodeEmail } from "../../adapters/email";
import { Member } from "../../lib/types";
import { ObjectId } from "mongodb";
import { AppError } from "../../lib/appError";
import { errorResponse, json, getClientIp } from "../../lib/http";
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

        const id = event.pathParameters?.id;
        if (!id) {
            return errorResponse(event, 400, "MEMBER_ID_REQUIRED_IN_PATH");
        }

        const { firstName, lastName, email, blocked, sendEmail, emailValid, emailInvalid } = JSON.parse(event.body || "{}");

        const db = await connectToMongo();
        const collection = db.collection<Member>("members");

        const member = await collection.findOne({ _id: new ObjectId(id) as any });

        if (!member) {
            return errorResponse(event, 404, "MEMBER_NOT_FOUND");
        }

        const updateFields: Partial<Member> = {};
        let emailChanged = false;

        if (email) {
            const trimmedEmail = email.trim().toLowerCase();

            if (trimmedEmail !== member.email) {
                const emailConflict = await collection.findOne({ email: trimmedEmail });
                if (emailConflict) {
                    return errorResponse(event, 409, "MEMBER_EMAIL_EXISTS");
                }

                updateFields.email = trimmedEmail;
                updateFields.emailValid = false;
                updateFields.emailInvalid = false;
                emailChanged = true;
            }
        }

        if (firstName && firstName.trim()) {
            updateFields.firstName = firstName.trim();
        }

        if (lastName && lastName.trim()) {
            updateFields.lastName = lastName.trim();
        }

        if (typeof blocked === "boolean") {
            updateFields.blocked = blocked;
        }
        if (typeof emailInvalid === "boolean") {
            updateFields.emailInvalid = emailInvalid;
        }
        if (typeof emailValid === "boolean") {
            updateFields.emailValid = emailValid;
        }

        if (Object.keys(updateFields).length > 0) {
            await collection.updateOne({ _id: new ObjectId(id) as any }, { $set: updateFields });

            const updatedMember = { ...member, ...updateFields };
            let emailSent = false;
            const shouldSendEmail = emailChanged && sendEmail !== false;

            if (shouldSendEmail) {
                const senderEmail = process.env.SES_SENDER_EMAIL;
                if (senderEmail) {
                    const { success } = await sendQrCodeEmail(
                        senderEmail,
                        updatedMember.firstName,
                        updatedMember.lastName,
                        updatedMember.email,
                        updatedMember.qrUuid
                    );

                    if (success) {
                        emailSent = true;
                        await collection.updateOne(
                            { _id: new ObjectId(id) as any },
                            { $set: { emailValid: true } }
                        );
                        updatedMember.emailValid = true;
                    }
                }
            }

            await auditLog({
                at: new Date(),
                action: "member_update",
                actor,
                resourceType: "member",
                resourceId: id,
                ip: getClientIp(event),
            });
            return json(200, { success: true, member: updatedMember, emailSent });
        }

        return json(200, { success: true, member });
    } catch (error) {
        if (error instanceof AppError && error.code === "INVALID_TOKEN") {
            return errorResponse(event, 401, "INVALID_TOKEN");
        }

        return errorResponse(event, 500, "INTERNAL_SERVER_ERROR");
    }
}