import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { connectToMongoose } from "../../adapters/mongoose";
import { enqueueQrEmails } from "../../adapters/emailQueue";
import { sendImportNotificationEmail } from "../../adapters/email";
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

/** Imports of at least this many new members trigger a notification email to IMPORT_NOTIFICATION_EMAIL. */
const IMPORT_NOTIFICATION_THRESHOLD = 20;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const startedAt = Date.now();
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
        emailInvalid: false,
        qrUuid: crypto.randomUUID(),
      });
    }

    if (docs.length === 0) {
      return json(200, { inserted: 0, invalid });
    }

    await connectToMongoose();

    let insertedDocs: Array<{ _id: unknown; email: unknown }>;
    let duplicates: number | undefined;

    try {
      insertedDocs = await MemberModel.insertMany(docs, { ordered: false });
    } catch (error) {
      const writeErrors = (error as { writeErrors?: Array<{ code?: number }> })?.writeErrors;
      const hasDuplicate =
        (error as { code?: number })?.code === 11000 ||
        (Array.isArray(writeErrors) && writeErrors.some((entry) => entry?.code === 11000));

      if (!hasDuplicate) {
        return errorResponse(event, 500, "INTERNAL_SERVER_ERROR");
      }

      // ordered: false still inserts the non-duplicate docs; they need their emails too
      const partial = (error as { insertedDocs?: Array<{ _id: unknown; email: unknown }> })?.insertedDocs;
      insertedDocs = Array.isArray(partial) ? partial : [];
      duplicates = writeErrors?.length ?? 0;
    }

    // Emails are sent asynchronously by the queue consumer, so this request stays short
    const sendTargetIds = insertedDocs
      .filter((doc) => sendEmailMap.get(String(doc.email).toLowerCase()))
      .map((doc) => String(doc._id));
    const { queued: emailQueued, failed: emailQueueFailed } = await enqueueQrEmails(sendTargetIds);

    const notificationEmail = process.env.IMPORT_NOTIFICATION_EMAIL;
    const senderEmail = process.env.SES_SENDER_EMAIL;
    if (notificationEmail && senderEmail && insertedDocs.length >= IMPORT_NOTIFICATION_THRESHOLD) {
      await sendImportNotificationEmail(senderEmail, notificationEmail, {
        inserted: insertedDocs.length,
        invalid,
        duplicates,
        emailQueued,
        emailQueueFailed,
        durationMs: Date.now() - startedAt,
        actor,
      });
    }

    await auditLog({
      at: new Date(),
      action: "members_bulk_create",
      actor,
      ip: getClientIp(event),
      details: { inserted: insertedDocs.length, invalid, duplicates, emailQueued, emailQueueFailed },
    });
    return json(200, {
      inserted: insertedDocs.length,
      invalid,
      ...(duplicates !== undefined ? { duplicates } : {}),
      emailQueued,
      emailQueueFailed,
    });
  } catch (error) {
    if (error instanceof AppError && error.code === "INVALID_TOKEN") {
      return errorResponse(event, 401, "INVALID_TOKEN");
    }
    return errorResponse(event, 500, "INTERNAL_SERVER_ERROR");
  }
};
