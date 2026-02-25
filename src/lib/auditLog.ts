import { connectToMongo } from "../adapters/database";

export type AuditAction =
  | "admin_login"
  | "member_create"
  | "member_update"
  | "member_delete"
  | "member_reset_qr"
  | "members_import"
  | "members_bulk_create";

export interface AuditEntry {
  at: Date;
  action: AuditAction;
  actor?: string;
  resourceType?: string;
  resourceId?: string;
  ip?: string;
  details?: Record<string, unknown>;
}

const COLLECTION = "audit_logs";

/**
 * Append an audit log entry. Fire-and-forget; does not throw.
 */
export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    const db = await connectToMongo();
    await db.collection(COLLECTION).insertOne({
      ...entry,
      at: entry.at ?? new Date(),
    });
  } catch {
    // Do not fail the request if audit write fails
  }
}
