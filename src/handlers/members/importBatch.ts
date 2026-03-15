import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { connectToMongo } from "../../adapters/database";
import { verifyJWT } from "../../lib/jwt";
import { AppError } from "../../lib/appError";
import { errorResponse, json, getClientIp } from "../../lib/http";
import { Member } from "../../lib/types";
import { auditLog } from "../../lib/auditLog";

type ImportMemberRow = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  blocked?: unknown;
  emailValid?: unknown;
  emailInvalid?: unknown;
  createdAt?: unknown;
};

function parseBooleanLoose(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1 ? true : v === 0 ? false : undefined;
  if (typeof v !== "string") return undefined;
  const s = v.trim().toLowerCase();
  if (!s) return undefined;
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return undefined;
}

function parseDateLoose(v: unknown): Date | undefined {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === "number") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
    return undefined;
  }
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s) return undefined;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  return undefined;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const token = event.headers.authorization?.split(" ")[1];
  if (!token) return errorResponse(event, 401, "NO_TOKEN_PROVIDED");

  try {
    const payload = verifyJWT(token) as { sub?: string };
    const actor = payload?.sub;

    const parsed = JSON.parse(event.body || "{}");
    const rows = (parsed?.members ?? parsed) as unknown;
    if (!Array.isArray(rows)) {
      return errorResponse(event, 400, "IMPORT_BATCH_REQUIRED");
    }

    // Keep each request safely under Lambda/API limits.
    if (rows.length > 1500) {
      return errorResponse(event, 400, "IMPORT_BATCH_TOO_LARGE", { max: 1500 });
    }

    const db = await connectToMongo();
    const collection = db.collection<Member>("members");

    let invalid = 0;
    let accepted = 0;
    const ops: any[] = [];

    for (const r of rows as ImportMemberRow[]) {
      const firstName = String(r?.firstName ?? "").trim();
      const lastName = String(r?.lastName ?? "").trim();
      const email = String(r?.email ?? "").trim().toLowerCase();

      if (!firstName || !lastName || !email) {
        invalid++;
        continue;
      }
      if (email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) === null) {
        invalid++;
        continue;
      }

      const blocked = parseBooleanLoose(r?.blocked) ?? false;
      const emailValid = parseBooleanLoose(r?.emailValid) ?? false;
      const emailInvalid = parseBooleanLoose(r?.emailInvalid) ?? false;
      const createdAt = parseDateLoose(r?.createdAt) ?? new Date();

      const doc: Member = {
        firstName,
        lastName,
        email,
        createdAt,
        blocked,
        qrUuid: crypto.randomUUID(),
        emailValid,
        emailInvalid,
      };

      // Upsert with $setOnInsert guarantees:
      // - Existing customers are NOT modified
      // - New customers are inserted
      ops.push({
        updateOne: {
          filter: { email },
          update: { $setOnInsert: doc },
          upsert: true,
        },
      });
      accepted++;
    }

    if (ops.length === 0) {
      await auditLog({
        at: new Date(),
        action: "members_import",
        actor,
        ip: getClientIp(event),
        details: { inserted: 0, accepted, invalid },
      });
      return json(200, { success: true, inserted: 0, accepted, invalid });
    }

    const result = await collection.bulkWrite(ops, { ordered: false });
    const inserted = result.upsertedCount ?? 0;
    await auditLog({
      at: new Date(),
      action: "members_import",
      actor,
      ip: getClientIp(event),
      details: { inserted, accepted, invalid },
    });
    return json(200, {
      success: true,
      inserted,
      accepted,
      invalid,
    });
  } catch (error) {
    if (error instanceof AppError && error.code === "INVALID_TOKEN") {
      return errorResponse(event, 401, "INVALID_TOKEN");
    }
    return errorResponse(event, 500, "INTERNAL_SERVER_ERROR");
  }
};

