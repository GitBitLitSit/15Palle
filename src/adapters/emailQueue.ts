import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs";

/** Message body for the QR email queue. Member data is re-read when sending. */
export type QueuedQrEmail = { memberId: string };

const SQS_BATCH_SIZE = 10;
const PARALLEL_REQUESTS = 10;

let client: SQSClient | null = null;

/**
 * Enqueues one QR email per member. Returns how many were queued; members whose message
 * could not be queued stay "pending" and can be resent manually.
 */
export async function enqueueQrEmails(memberIds: string[]): Promise<{ queued: number; failed: number }> {
    if (memberIds.length === 0) return { queued: 0, failed: 0 };

    const queueUrl = process.env.EMAIL_QUEUE_URL;
    if (!queueUrl) {
        throw new Error("EMAIL_QUEUE_URL is not set");
    }
    client ??= new SQSClient({});

    const batches: string[][] = [];
    for (let i = 0; i < memberIds.length; i += SQS_BATCH_SIZE) {
        batches.push(memberIds.slice(i, i + SQS_BATCH_SIZE));
    }

    let queued = 0;
    let failed = 0;

    for (let i = 0; i < batches.length; i += PARALLEL_REQUESTS) {
        await Promise.all(batches.slice(i, i + PARALLEL_REQUESTS).map(async (batch) => {
            try {
                const res = await client!.send(new SendMessageBatchCommand({
                    QueueUrl: queueUrl,
                    Entries: batch.map((memberId, index) => ({
                        Id: String(index),
                        MessageBody: JSON.stringify({ memberId } satisfies QueuedQrEmail),
                    })),
                }));
                queued += res.Successful?.length ?? 0;
                failed += res.Failed?.length ?? 0;
            } catch (err) {
                console.error("Failed to enqueue QR email batch", err);
                failed += batch.length;
            }
        }));
    }

    return { queued, failed };
}
