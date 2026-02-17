import { connectToMongo } from "../../adapters/database";
import { Member, EmailVerification } from "../../lib/types";
import { sendVerificationEmail } from "../../adapters/email";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { errorResponse, messageResponse } from "../../lib/http";

const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between sends
const MAX_REQUESTS_PER_WINDOW = 3;
const REQUEST_WINDOW_MS = 15 * 60 * 1000; // 15-minute request window
const RATE_LIMIT_COOLDOWN_MS = 15 * 60 * 1000; // 15-minute lock after reaching max requests

const parseDate = (value?: Date | string | null): Date | null => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const SAFE_RESPONSE = messageResponse(event, 200, "IF_ACCOUNT_EXISTS");
        const payload = JSON.parse(event.body || "{}");
        const rawEmail = typeof payload.email === "string" ? payload.email : "";
        const trimmedEmail = rawEmail.trim().toLowerCase();

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
        const now = new Date();
        const nowMs = now.getTime();

        let requestCount = 0;
        let requestWindowStartedAt = now;

        if (existingRecord) {
            const cooldownUntil = parseDate(existingRecord.cooldownUntil);
            if (cooldownUntil && cooldownUntil.getTime() > nowMs) {
                return SAFE_RESPONSE;
            }

            const lastSentAt = parseDate(existingRecord.lastSentAt) ?? parseDate(existingRecord.createdAt);
            if (lastSentAt && nowMs - lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
                return SAFE_RESPONSE;
            }

            const existingWindowStart = parseDate(existingRecord.requestWindowStartedAt) ?? parseDate(existingRecord.createdAt);
            if (existingWindowStart && nowMs - existingWindowStart.getTime() < REQUEST_WINDOW_MS) {
                // Legacy records may not have requestCount; if a code exists, at least one email was sent.
                requestCount = typeof existingRecord.requestCount === "number" ? existingRecord.requestCount : 1;
                requestWindowStartedAt = existingWindowStart;
            }

            if (requestCount >= MAX_REQUESTS_PER_WINDOW) {
                await verificationCollection.updateOne(
                    { _id: existingRecord._id },
                    { $set: { cooldownUntil: new Date(nowMs + RATE_LIMIT_COOLDOWN_MS) } }
                );
                return SAFE_RESPONSE;
            }
        }

        requestCount += 1;
        const cooldownUntil = requestCount >= MAX_REQUESTS_PER_WINDOW
            ? new Date(nowMs + RATE_LIMIT_COOLDOWN_MS)
            : undefined;

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationPayload: EmailVerification = {
            memberId: member._id,
            verificationCode: verificationCode,
            createdAt: now,
            lastSentAt: now,
            expiresAt: new Date(nowMs + 15 * 60 * 1000),
            requestCount,
            requestWindowStartedAt,
            ...(cooldownUntil ? { cooldownUntil } : {})
        };

        if (existingRecord) {
            await verificationCollection.updateOne(
                { _id: existingRecord._id },
                {
                    $set: verificationPayload,
                    ...(cooldownUntil ? {} : { $unset: { cooldownUntil: "" } })
                }
            );
        } else {
            await verificationCollection.insertOne(verificationPayload);
        }

        const emailResult = await sendVerificationEmail(
            process.env.SES_SENDER_EMAIL!,
            trimmedEmail,
            verificationCode,
            member.firstName
        );

        if (!emailResult.success) {
            // Keep a privacy-safe response while still surfacing operational issues in logs.
            console.error("Verification email was not sent:", emailResult.error);
        }

        return SAFE_RESPONSE;

    } catch (error) {
        console.error("Request Code Error:", error);
        return errorResponse(event, 500, "INTERNAL_SERVER_ERROR");
    }
};