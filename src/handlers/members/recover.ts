import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { connectToMongo } from "../../adapters/database";
import { Member, EmailVerification } from "../../lib/types";
import { sendQrCodeEmail } from "../../adapters/email";
import QRCode from "qrcode";
import { errorResponse, messageResponse } from "../../lib/http";
import { checkBodySize } from "../../lib/bodySize";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const bodySizeRes = checkBodySize(event);
    if (bodySizeRes) return bodySizeRes;

    try {
        let { email, verificationCode, deliveryMethod } = JSON.parse(event.body || "{}");

        const trimmedEmail = email?.trim() ?? "";
        const trimmedVerificationCode = verificationCode?.trim() ?? "";

        const method = (deliveryMethod === "email") ? "email" : "display";

        if (!trimmedEmail || !trimmedVerificationCode) {
            return errorResponse(event, 400, "EMAIL_AND_CONFIRMATION_CODE");
        }

        const db = await connectToMongo();
        const memberCollection = db.collection<Member>("members");

        const memberRecord = await memberCollection.findOne({ email: trimmedEmail });

        if (!memberRecord) {
            return errorResponse(event, 404, "MEMBER_NOT_FOUND");
        }

        const emailVerificationCollection = db.collection<EmailVerification>("emailVerifications");

        const emailVerificationRecord = await emailVerificationCollection.findOne({ memberId: memberRecord._id, verificationCode: trimmedVerificationCode });

        if (!emailVerificationRecord) {
            return errorResponse(event, 403, "INVALID_EMAIL_OR_CODE");
        } else if (new Date(emailVerificationRecord.expiresAt) < new Date()) {
            return errorResponse(event, 400, "CODE_EXPIRED");
        } else if (emailVerificationRecord.verificationCode !== trimmedVerificationCode) {
            return errorResponse(event, 400, "INVALID_CODE");
        }

        await memberCollection.updateOne(
            { _id: memberRecord._id },
            { $set: { emailValid: true } }
        );

        await emailVerificationCollection.deleteOne({ _id: emailVerificationRecord._id });

        if (method === "email") {
            await sendQrCodeEmail(process.env.SES_SENDER_EMAIL!, memberRecord.firstName, memberRecord.lastName, memberRecord.email, memberRecord.qrUuid);
            return messageResponse(event, 200, "QR_CODE_SEND_TO_EMAIL", undefined, { success: true });
        } else {
            const qrImage = await QRCode.toDataURL(memberRecord.qrUuid);
            return messageResponse(event, 200, "CODE_VERIFIED_SUCCESSFULLY", undefined, {
                success: true,
                qrImage: qrImage,
                member: memberRecord
            });
        }
    } catch (error) {
        return errorResponse(event, 500, "INTERNAL_SERVER_ERROR");
    }
}