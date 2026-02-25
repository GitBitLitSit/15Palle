import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { MongoBulkWriteError } from "mongodb";
import { connectToMongo } from "../../adapters/database";
import { verifyJWT } from "../../lib/jwt";
import { AppError } from "../../lib/appError";
import { errorResponse, json, getClientIp } from "../../lib/http";
import { Member } from "../../lib/types";
import { parseCsv } from "../../lib/csv";
import { auditLog } from "../../lib/auditLog";

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[\s_-]+/g, "");
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  if (["true", "1", "yes", "y"].includes(v)) return true;
  if (["false", "0", "no", "n"].includes(v)) return false;
  return undefined;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const token = event.headers.authorization?.split(" ")[1];
  if (!token) {
    return errorResponse(event, 401, "NO_TOKEN_PROVIDED");
  }

  try {
    const payload = verifyJWT(token) as { sub?: string };
    const actor = payload?.sub;

    if (!event.body) {
      return errorResponse(event, 400, "CSV_REQUIRED");
    }

    const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
    const rows = parseCsv(raw);
    if (rows.length === 0) {
      return errorResponse(event, 400, "CSV_INVALID");
    }

    // Detect header row (exported files will include headers)
    const firstRow = rows[0].map((v) => normalizeHeader(String(v)));
    const hasHeader = firstRow.includes("email") || firstRow.includes("e-mail") || firstRow.includes("mail");

    const header = hasHeader
      ? firstRow
      : ["firstname", "lastname", "email", "blocked", "emailvalid", "createdat"];
    const dataRows = hasHeader ? rows.slice(1) : rows;

    const idx = (name: string) => header.findIndex((h) => h === normalizeHeader(name));
    const firstNameIdx = header.findIndex((h) => h === "firstname");
    const lastNameIdx = header.findIndex((h) => h === "lastname");
    const emailIdx = header.findIndex((h) => h === "email" || h === "mail" || h === "e-mail");
    const blockedIdx = idx("blocked");
    const emailValidIdx = idx("emailvalid");
    const createdAtIdx = idx("createdat");

    if (firstNameIdx < 0 || lastNameIdx < 0 || emailIdx < 0) {
      return errorResponse(event, 400, "CSV_INVALID");
    }

    const candidates: Array<{
      firstName: string;
      lastName: string;
      email: string;
      blocked?: boolean;
      emailValid?: boolean;
      createdAt?: Date;
    }> = [];

    let skippedInvalid = 0;
    let skippedDuplicateInFile = 0;

    const seenEmails = new Set<string>();
    for (const row of dataRows) {
      const firstName = String(row[firstNameIdx] ?? "").trim();
      const lastName = String(row[lastNameIdx] ?? "").trim();
      const emailRaw = String(row[emailIdx] ?? "").trim();
      const email = emailRaw.toLowerCase();

      if (!firstName || !lastName || !email) {
        skippedInvalid++;
        continue;
      }
      if (email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) === null) {
        skippedInvalid++;
        continue;
      }
      if (seenEmails.has(email)) {
        skippedDuplicateInFile++;
        continue;
      }
      seenEmails.add(email);

      const blocked = blockedIdx >= 0 ? parseBoolean(String(row[blockedIdx] ?? "")) : undefined;
      const emailValid = emailValidIdx >= 0 ? parseBoolean(String(row[emailValidIdx] ?? "")) : undefined;

      let createdAt: Date | undefined;
      if (createdAtIdx >= 0) {
        const rawDate = String(row[createdAtIdx] ?? "").trim();
        if (rawDate) {
          const d = new Date(rawDate);
          if (!Number.isNaN(d.getTime())) createdAt = d;
        }
      }

      candidates.push({ firstName, lastName, email, blocked, emailValid, createdAt });
    }

    if (candidates.length === 0) {
      await auditLog({
        at: new Date(),
        action: "members_import",
        actor,
        ip: getClientIp(event),
        details: { inserted: 0, skippedInvalid, skippedDuplicateInFile },
      });
      return json(200, {
        success: true,
        inserted: 0,
        skippedExisting: 0,
        skippedInvalid,
        skippedDuplicateInFile,
      });
    }

    const db = await connectToMongo();
    const collection = db.collection<Member>("members");

    // Find existing members by email (case-insensitive)
    const allEmails = candidates.map((c) => c.email);
    const existing = new Set<string>();
    for (const emailChunk of chunk(allEmails, 500)) {
      const found = await collection
        .find({ email: { $in: emailChunk } } as any, { projection: { email: 1 } })
        .collation({ locale: "en", strength: 2 })
        .toArray();
      for (const f of found) {
        if ((f as any)?.email) existing.add(String((f as any).email).toLowerCase());
      }
    }

    const toInsert: Member[] = [];
    let skippedExisting = 0;

    for (const c of candidates) {
      if (existing.has(c.email)) {
        skippedExisting++;
        continue;
      }
      toInsert.push({
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        createdAt: c.createdAt ?? new Date(),
        blocked: c.blocked ?? false,
        qrUuid: crypto.randomUUID(),
        emailValid: c.emailValid ?? false,
      });
    }

    let inserted = 0;
    if (toInsert.length > 0) {
      try {
        const result = await collection.insertMany(toInsert, { ordered: false });
        inserted = result.insertedCount;
      } catch (e) {
        // Allow duplicates due to races/unique constraint and still report partial insert count.
        if (e instanceof MongoBulkWriteError) {
          inserted = e.result?.insertedCount ?? 0;
        } else {
          throw e;
        }
      }
    }

    await auditLog({
      at: new Date(),
      action: "members_import",
      actor,
      ip: getClientIp(event),
      details: { inserted, skippedExisting, skippedInvalid, skippedDuplicateInFile },
    });
    return json(200, {
      success: true,
      inserted,
      skippedExisting,
      skippedInvalid,
      skippedDuplicateInFile,
    });
  } catch (error) {
    if (error instanceof AppError && error.code === "INVALID_TOKEN") {
      return errorResponse(event, 401, "INVALID_TOKEN");
    }
    return errorResponse(event, 500, "INTERNAL_SERVER_ERROR");
  }
};

