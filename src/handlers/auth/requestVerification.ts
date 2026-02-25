import { connectToMongo } from "../../adapters/database";
import { Member, EmailVerification } from "../../lib/types";
import { sendVerificationEmail } from "../../adapters/email";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { errorResponse, messageResponse } from "../../lib/http";
import { checkRateLimit } from "../../lib/rateLimit";
import { checkBodySize } from "../../lib/bodySize";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const SAFE_RESPONSE = messageResponse(event, 200, "IF_ACCOUNT_EXISTS");

    const bodySizeRes = checkBodySize(event);
    if (bodySizeRes) return bodySizeRes;
    const rateLimitRes = await checkRateLimit(event, "auth:request-verification", { maxRequests: 10 });
    if (rateLimitRes) return rateLimitRes;

    try {
        let { email } = JSON.parse(event.body || "{}");
        const trimmedEmail = email?.trim() ?? "";

        if (!trimmedEmail) {
            return errorResponse(event, 400, "EMAIL_REQUIRED");
        }

        const db = await connectToMongo();
        const member = await db.collection<Member>("members").findOne({ email: trimmedEmail });

        if (!member) {
            return SAFE_RESPONSE;
        }

        const verificationCollection = db.collection<EmailVerification>("emailVerifications");
        const existingRecord = await verificationCollection.findOne({ memberId: member._id });

        if (existingRecord) {
            const now = new Date();
            const timeDiff = now.getTime() - new Date(existingRecord.createdAt).getTime();
            const COOLDOWN_SECONDS = 60; // 1 Minute Cooldown

            if (timeDiff < COOLDOWN_SECONDS * 1000) {
                return SAFE_RESPONSE;
            }

            await verificationCollection.deleteOne({ _id: existingRecord._id });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        await verificationCollection.insertOne({
            memberId: member._id,
            verificationCode: verificationCode,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 mins
        });

        await sendVerificationEmail(
            process.env.SES_SENDER_EMAIL!,
            trimmedEmail,
            verificationCode,
            member.firstName
        );

        return SAFE_RESPONSE;

    } catch (error) {
        return errorResponse(event, 500, "INTERNAL_SERVER_ERROR");
    }
};