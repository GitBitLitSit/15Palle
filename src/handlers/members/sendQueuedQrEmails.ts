import { SQSBatchItemFailure, SQSBatchResponse, SQSEvent } from "aws-lambda";
import { ObjectId } from "mongodb";
import { promises as dns } from "dns";
import { connectToMongo } from "../../adapters/database";
import { buildQrCodeMail, createMailTransport } from "../../adapters/email";
import { QueuedQrEmail } from "../../adapters/emailQueue";

type DomainCheck = "ok" | "invalid" | "unknown";
type SendOutcome = "sent" | "invalid" | "retry";

/**
 * "invalid" only when DNS says the domain cannot receive mail (typos like gmial.com).
 * Temporary DNS problems return "unknown" so the message is retried.
 */
export async function checkMailDomain(domain: string): Promise<DomainCheck> {
    try {
        const records = await dns.resolveMx(domain);
        // Null MX (RFC 7505): domain explicitly accepts no mail
        if (records.length === 0 || records.every((r) => r.exchange === "" || r.exchange === ".")) {
            return "invalid";
        }
        return "ok";
    } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === "ENOTFOUND") return "invalid";
        if (code !== "ENODATA") return "unknown";
    }

    // No MX record: mail falls back to the A/AAAA record (implicit MX)
    try {
        const [a, aaaa] = await Promise.allSettled([dns.resolve4(domain), dns.resolve6(domain)]);
        const hasAddress = [a, aaaa].some((r) => r.status === "fulfilled" && r.value.length > 0);
        return hasAddress ? "ok" : "invalid";
    } catch {
        return "unknown";
    }
}

/** SMTP 5xx on RCPT TO means the server rejected this recipient permanently. */
export function isPermanentRecipientError(err: unknown): boolean {
    const e = err as { code?: string; responseCode?: number; rejected?: unknown[] };
    return (
        e?.code === "EENVELOPE" &&
        Array.isArray(e.rejected) &&
        e.rejected.length > 0 &&
        typeof e.responseCode === "number" &&
        e.responseCode >= 500
    );
}

/**
 * SQS consumer: sends the QR email for each queued member.
 * - sent           -> emailValid = true
 * - invalid address -> emailInvalid = true, no retry
 * - temporary error -> reported as batch item failure; SQS retries up to the queue's
 *                      maxReceiveCount, then moves the message to the dead-letter queue.
 */
export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
    const failures: SQSBatchItemFailure[] = [];

    const jobs = event.Records.flatMap((record) => {
        try {
            const { memberId } = JSON.parse(record.body) as QueuedQrEmail;
            if (typeof memberId === "string" && ObjectId.isValid(memberId)) {
                return [{ messageId: record.messageId, memberId }];
            }
        } catch {
            // fall through: malformed message is dropped
        }
        console.error("Dropping malformed QR email message", record.messageId);
        return [];
    });
    if (jobs.length === 0) return { batchItemFailures: failures };

    const senderEmail = process.env.SES_SENDER_EMAIL;
    if (!senderEmail) {
        throw new Error("SES_SENDER_EMAIL is not set");
    }

    const db = await connectToMongo();
    const members = db.collection("members");
    const found = await members
        .find({ _id: { $in: jobs.map((j) => new ObjectId(j.memberId)) } })
        .toArray();
    const memberById = new Map(found.map((m) => [String(m._id), m]));

    const transporter = createMailTransport({ pool: true });
    const domainChecks = new Map<string, Promise<DomainCheck>>();

    const send = async (member: (typeof found)[number]): Promise<SendOutcome> => {
        const email = String(member.email);
        const domain = email.split("@")[1]?.toLowerCase() ?? "";
        if (!domainChecks.has(domain)) {
            domainChecks.set(domain, checkMailDomain(domain));
        }
        const domainCheck = await domainChecks.get(domain)!;
        if (domainCheck === "invalid") return "invalid";
        if (domainCheck === "unknown") return "retry";

        try {
            await transporter.sendMail(await buildQrCodeMail(
                senderEmail,
                String(member.firstName),
                String(member.lastName),
                email,
                String(member.qrUuid),
            ));
            return "sent";
        } catch (err) {
            if (isPermanentRecipientError(err)) return "invalid";
            const e = err as { code?: string; responseCode?: number };
            console.warn("QR email send failed, will retry", { memberId: String(member._id), code: e?.code, responseCode: e?.responseCode });
            return "retry";
        }
    };

    try {
        await Promise.all(jobs.map(async ({ messageId, memberId }) => {
            const member = memberById.get(memberId);
            // Deleted in the meantime, or already handled (SQS can deliver a message twice)
            if (!member || member.emailValid || member.emailInvalid) return;

            try {
                const outcome = await send(member);
                if (outcome === "sent") {
                    await members.updateOne({ _id: member._id }, { $set: { emailValid: true } });
                } else if (outcome === "invalid") {
                    console.warn("QR email address invalid, not retrying", { memberId });
                    await members.updateOne({ _id: member._id }, { $set: { emailInvalid: true } });
                } else {
                    failures.push({ itemIdentifier: messageId });
                }
            } catch (err) {
                console.error("QR email job failed, will retry", { memberId, err });
                failures.push({ itemIdentifier: messageId });
            }
        }));
    } finally {
        transporter.close();
    }

    return { batchItemFailures: failures };
};
