import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { connectToMongoose } from "../../adapters/mongoose";
import { sendQrCodeEmail } from "../../adapters/email";
import { AppError } from "../../lib/appError";
import { errorResponse, json, getClientIp } from "../../lib/http";
import { verifyJWT } from "../../lib/jwt";
import { MemberModel } from "../../models/member";
import { auditLog } from "../../lib/auditLog";

type IncomingUser = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  sendEmail?: unknown;
};

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    await Promise.all(batch.map((item) => worker(item)));
  }
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const token = event.headers.authorization?.split(" ")[1];
  if (!token) {
    return errorResponse(event, 401, "NO_TOKEN_PROVIDED");
  }

  try {
    const payload = verifyJWT(token) as { sub?: string };
    const actor = payload?.sub;

    const parsed = JSON.parse(event.body || "{}");
    const rawUsers = Array.isArray(parsed) ? parsed : parsed?.users;

    if (!Array.isArray(rawUsers)) {
      return errorResponse(event, 400, "USERS_REQUIRED");
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const docs = [];
    let invalid = 0;
    const sendEmailMap = new Map<string, boolean>();

    // Sanitize and normalize the incoming payload before insertMany.
    for (const user of rawUsers as IncomingUser[]) {
      const firstName = String(user?.firstName ?? "").trim();
      const lastName = String(user?.lastName ?? "").trim();
      const email = String(user?.email ?? "").trim().toLowerCase();
      const sendEmail = typeof user?.sendEmail === "boolean" ? user.sendEmail : false;

      if (!firstName || !lastName || !email || emailPattern.test(email) === false) {
        invalid += 1;
        continue;
      }

      sendEmailMap.set(email, sendEmail);
      docs.push({
        firstName,
        lastName,
        email,
        createdAt: new Date(),
        blocked: false,
        emailValid: false,
        qrUuid: crypto.randomUUID(),
      });
    }

    if (docs.length === 0) {
      return json(200, { inserted: 0, invalid });
    }

    await connectToMongoose();

    try {
      const insertedDocs = await MemberModel.insertMany(docs, { ordered: false });

      let emailSent = 0;
      let emailFailed = 0;
      const sendTargets = insertedDocs.filter((doc) => sendEmailMap.get(String(doc.email).toLowerCase()));

      if (sendTargets.length > 0) {
        const senderEmail = process.env.SES_SENDER_EMAIL;
        if (!senderEmail) {
          return errorResponse(event, 500, "INTERNAL_SERVER_ERROR");
        }

        await runWithConcurrency(sendTargets, 5, async (doc) => {
          const { success } = await sendQrCodeEmail(
            senderEmail,
            String(doc.firstName),
            String(doc.lastName),
            String(doc.email),
            String(doc.qrUuid),
          );

          if (success) {
            emailSent += 1;
            await MemberModel.updateOne({ _id: doc._id }, { $set: { emailValid: true } });
          } else {
            emailFailed += 1;
          }
        });
      }

      await auditLog({
        at: new Date(),
        action: "members_bulk_create",
        actor,
        ip: getClientIp(event),
        details: { inserted: insertedDocs.length, invalid, emailSent, emailFailed },
      });
      return json(200, { inserted: insertedDocs.length, invalid, emailSent, emailFailed });
    } catch (error) {
      const writeErrors = (error as { writeErrors?: Array<{ code?: number }> })?.writeErrors;
      const hasDuplicate =
        (error as { code?: number })?.code === 11000 ||
        (Array.isArray(writeErrors) && writeErrors.some((entry) => entry?.code === 11000));

      if (hasDuplicate) {
        const inserted = Array.isArray((error as { insertedDocs?: unknown[] })?.insertedDocs)
          ? (error as { insertedDocs?: unknown[] }).insertedDocs?.length ?? 0
          : 0;
        const duplicates = writeErrors?.length ?? 0;
        return json(200, { inserted, invalid, duplicates });
      }

      return errorResponse(event, 500, "INTERNAL_SERVER_ERROR");
    }
  } catch (error) {
    if (error instanceof AppError && error.code === "INVALID_TOKEN") {
      return errorResponse(event, 401, "INVALID_TOKEN");
    }
    return errorResponse(event, 500, "INTERNAL_SERVER_ERROR");
  }
};
