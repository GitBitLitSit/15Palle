import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { connectToMongo } from "../../adapters/database";
import { verifyJWT } from "../../lib/jwt";
import { Member, CheckIn } from "../../lib/types";
import { broadcastToDashboard } from "../../adapters/notification";
import { Collection, ObjectId } from "mongodb";
import { AppError } from "../../lib/appError";
import { errorResponse, getRequestLanguage, messageResponse } from "../../lib/http";
import { t } from "../../lib/i18n";

type CheckInWarningCode = "INVALID_QR" | "MEMBER_BLOCKED" | "PASSBACK_WARNING";

async function recordAndBroadcast(
    checkinsCollection: Collection<CheckIn>,
    now: Date,
    params: {
        memberId: ObjectId | null;
        source: CheckIn["source"];
        warning: string | null;
        warningCode?: CheckInWarningCode | null;
        warningParams?: Record<string, unknown>;
        qrUuid?: string;
        broadcastMember: Member;
    }
) {
    await checkinsCollection.insertOne({
        memberId: params.memberId as any,
        checkInTime: now,
        source: params.source,
        warning: params.warning,
        warningCode: params.warningCode ?? null,
        warningParams: params.warningParams,
        qrUuid: params.qrUuid
    } as any);

    try {
        await broadcastToDashboard({
            type: "NEW_CHECKIN",
            member: params.broadcastMember,
            warning: params.warning,
            warningCode: params.warningCode ?? null,
            warningParams: params.warningParams,
            timestamp: now
        });
    } catch (wsError) {
        console.error("Failed to broadcast:", wsError);
    }
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {

    let isAuthenticated = false;
    let authSource: CheckIn["source"] = "unknown";

    // Raspberry Pi login
    const apiKey = event.headers["x-api-key"];
    const validApiKey = process.env.RASPBERRY_PI_API_KEY;

    // Admin login
    const token = event.headers.authorization?.split(" ")[1];

    try {
        if (apiKey && apiKey === validApiKey) {
            isAuthenticated = true;
            authSource = "raspberry_pi";
        } else if (token) {
            verifyJWT(token);
            isAuthenticated = true;
            authSource = "admin";
        }

        if (!isAuthenticated) {
            return errorResponse(event, 401, "NO_VALID_CREDENTIALS", undefined, { success: false });
        }

        const requestLanguage = getRequestLanguage(event);
        let { qrUuid } = JSON.parse(event.body || "{}");
        const trimmedQrCode = qrUuid?.trim() ?? "";
        const now = new Date();

        if (!trimmedQrCode) {
            return errorResponse(event, 400, "QRUUID_REQUIRED");
        }

        const db = await connectToMongo();
        const membersCollection = db.collection<Member>("members");
        const checkinsCollection = db.collection<CheckIn>("checkins");

        const member = await membersCollection.findOne({ qrUuid: trimmedQrCode });

        if (!member) {
            const warningCode: CheckInWarningCode = "INVALID_QR";
            const warningMsg = t(requestLanguage, `warnings.${warningCode}`);

            await recordAndBroadcast(checkinsCollection, now, {
                memberId: null,
                source: authSource,
                warning: warningMsg,
                warningCode,
                qrUuid: trimmedQrCode,
                broadcastMember: {
                    _id: "unknown",
                    firstName: "Unknown",
                    lastName: "Visitor",
                    email: "Invalid QR",
                    createdAt: new Date(),
                    blocked: false,
                    emailValid: false,
                    qrUuid: trimmedQrCode
                }
            });

            return errorResponse(event, 404, "MEMBER_NOT_FOUND", undefined, { success: false });
        }

        if (member.blocked) {
            const warningCode: CheckInWarningCode = "MEMBER_BLOCKED";
            const warningMsg = t(requestLanguage, `warnings.${warningCode}`);

            await recordAndBroadcast(checkinsCollection, now, {
                memberId: new ObjectId(member._id),
                source: authSource,
                warning: warningMsg,
                warningCode,
                broadcastMember: { ...member, _id: member._id }
            });

            return errorResponse(event, 403, "MEMBER_BLOCKED", undefined, { success: false });
        }

        const lastCheckin = await checkinsCollection.findOne(
            { memberId: member._id },
            { sort: { checkInTime: -1 } }
        );

        const COOLDOWN_MINUTES = 5;
        let warning: string | null = null;
        let warningCode: CheckInWarningCode | null = null;
        let warningParams: Record<string, unknown> | undefined;

        if (lastCheckin) {
            const diffMs = now.getTime() - new Date(lastCheckin.checkInTime).getTime();
            const diffMinutes = diffMs / 1000 / 60;

            if (diffMinutes < COOLDOWN_MINUTES) {
                const roundedMinutes = Math.max(1, Math.ceil(diffMinutes));
                warningCode = "PASSBACK_WARNING";
                warningParams = { minutes: roundedMinutes };
                warning = t(requestLanguage, `warnings.${warningCode}`, warningParams);
            }
        }

        await recordAndBroadcast(checkinsCollection, now, {
            memberId: new ObjectId(member._id),
            source: authSource,
            warning: warning,
            warningCode,
            warningParams,
            broadcastMember: { ...member, _id: member._id }
        });

        return messageResponse(event, 200, "ACCESS_GRANTED", undefined, {
            success: true,
            warning: warning,
            warningCode,
            warningParams,
            member: {
                firstName: member.firstName,
                lastName: member.lastName,
                email: member.email,
                emailValid: member.emailValid,
                id: member._id
            }
        });
    } catch (error) {
        if (error instanceof AppError && error.code === "INVALID_TOKEN") {
            return errorResponse(event, 401, "INVALID_TOKEN", undefined, { success: false });
        }
        return errorResponse(event, 500, "INTERNAL_SERVER_ERROR", undefined, { success: false });
    }
};