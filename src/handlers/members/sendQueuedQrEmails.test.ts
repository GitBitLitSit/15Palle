import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import type { SQSEvent } from "aws-lambda";

const members: any[] = [];
const updateOneMock = vi.fn();
const mockDb = {
  collection: () => ({
    find: (filter: any) => ({
      toArray: async () => {
        const ids = filter._id.$in.map(String);
        return members.filter((m) => ids.includes(String(m._id)));
      },
    }),
    updateOne: (...args: any[]) => updateOneMock(...args),
  }),
};

const sendMailMock = vi.fn();
const closeMock = vi.fn();
const resolveMxMock = vi.fn();
const resolve4Mock = vi.fn();
const resolve6Mock = vi.fn();

vi.mock("../../adapters/database", () => ({ connectToMongo: () => Promise.resolve(mockDb) }));
vi.mock("../../adapters/email", () => ({
  buildQrCodeMail: async (_from: string, _first: string, _last: string, to: string) => ({ to }),
  createMailTransport: () => ({ sendMail: sendMailMock, close: closeMock }),
}));
vi.mock("dns", () => ({
  promises: {
    resolveMx: (...args: any[]) => resolveMxMock(...args),
    resolve4: (...args: any[]) => resolve4Mock(...args),
    resolve6: (...args: any[]) => resolve6Mock(...args),
  },
}));

const { handler, isPermanentRecipientError } = await import("./sendQueuedQrEmails");

function dnsError(code: string) {
  return Object.assign(new Error(code), { code });
}

function addMember(email: string, extra: Record<string, unknown> = {}) {
  const member = {
    _id: new ObjectId(),
    firstName: "Mario",
    lastName: "Rossi",
    email,
    qrUuid: crypto.randomUUID(),
    emailValid: false,
    emailInvalid: false,
    ...extra,
  };
  members.push(member);
  return member;
}

function sqsEvent(bodies: string[]): SQSEvent {
  return {
    Records: bodies.map((body, i) => ({ messageId: `msg-${i}`, body })) as any,
  };
}

function eventFor(...list: Array<{ _id: ObjectId }>) {
  return sqsEvent(list.map((m) => JSON.stringify({ memberId: String(m._id) })));
}

function updatedFields(member: { _id: ObjectId }) {
  const call = updateOneMock.mock.calls.find(([filter]) => String(filter._id) === String(member._id));
  return call?.[1].$set;
}

describe("sendQueuedQrEmails", () => {
  beforeEach(() => {
    members.length = 0;
    updateOneMock.mockReset();
    sendMailMock.mockReset();
    sendMailMock.mockResolvedValue({});
    closeMock.mockReset();
    resolveMxMock.mockReset();
    resolveMxMock.mockResolvedValue([{ exchange: "mx.example.com", priority: 10 }]);
    resolve4Mock.mockReset();
    resolve6Mock.mockReset();
  });

  it("sends the mail and marks the member as valid", async () => {
    const member = addMember("mario@gmail.com");
    const res = await handler(eventFor(member));

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(updatedFields(member)).toEqual({ emailValid: true });
    expect(res.batchItemFailures).toEqual([]);
    expect(closeMock).toHaveBeenCalled();
  });

  it("marks member invalid without sending when the domain does not exist", async () => {
    const member = addMember("mario@gmial.com");
    resolveMxMock.mockRejectedValue(dnsError("ENOTFOUND"));

    const res = await handler(eventFor(member));

    expect(sendMailMock).not.toHaveBeenCalled();
    expect(updatedFields(member)).toEqual({ emailInvalid: true });
    expect(res.batchItemFailures).toEqual([]);
  });

  it("accepts domains without MX that have an A record", async () => {
    const member = addMember("mario@example.org");
    resolveMxMock.mockRejectedValue(dnsError("ENODATA"));
    resolve4Mock.mockResolvedValue(["1.2.3.4"]);
    resolve6Mock.mockRejectedValue(dnsError("ENODATA"));

    await handler(eventFor(member));

    expect(updatedFields(member)).toEqual({ emailValid: true });
  });

  it("retries on temporary DNS errors", async () => {
    const member = addMember("mario@gmail.com");
    resolveMxMock.mockRejectedValue(dnsError("ETIMEOUT"));

    const res = await handler(eventFor(member));

    expect(sendMailMock).not.toHaveBeenCalled();
    expect(updateOneMock).not.toHaveBeenCalled();
    expect(res.batchItemFailures).toEqual([{ itemIdentifier: "msg-0" }]);
  });

  it("marks member invalid when the SMTP server rejects the recipient permanently", async () => {
    const member = addMember("nobody@gmail.com");
    sendMailMock.mockRejectedValue(
      Object.assign(new Error("rejected"), { code: "EENVELOPE", responseCode: 550, rejected: ["nobody@gmail.com"] }),
    );

    const res = await handler(eventFor(member));

    expect(updatedFields(member)).toEqual({ emailInvalid: true });
    expect(res.batchItemFailures).toEqual([]);
  });

  it("reports only the temporarily failed message for retry", async () => {
    const ok = addMember("ok@gmail.com");
    const flaky = addMember("flaky@gmail.com");
    sendMailMock.mockImplementation(async (mail: { to: string }) => {
      if (mail.to === flaky.email) throw Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
      return {};
    });

    const res = await handler(eventFor(ok, flaky));

    expect(updatedFields(ok)).toEqual({ emailValid: true });
    expect(updatedFields(flaky)).toBeUndefined();
    expect(res.batchItemFailures).toEqual([{ itemIdentifier: "msg-1" }]);
  });

  it("skips deleted members and members already handled", async () => {
    const done = addMember("done@gmail.com", { emailValid: true });
    const invalid = addMember("bad@gmail.com", { emailInvalid: true });
    const deleted = { _id: new ObjectId() };

    const res = await handler(eventFor(done, invalid, deleted));

    expect(sendMailMock).not.toHaveBeenCalled();
    expect(updateOneMock).not.toHaveBeenCalled();
    expect(res.batchItemFailures).toEqual([]);
  });

  it("drops malformed messages", async () => {
    const res = await handler(sqsEvent(["not json", JSON.stringify({ memberId: "123" })]));

    expect(sendMailMock).not.toHaveBeenCalled();
    expect(res.batchItemFailures).toEqual([]);
  });
});

describe("isPermanentRecipientError", () => {
  it("does not treat auth or sender errors as invalid recipients", () => {
    expect(isPermanentRecipientError({ code: "EAUTH", responseCode: 535 })).toBe(false);
    expect(isPermanentRecipientError({ code: "EENVELOPE", responseCode: 553 })).toBe(false);
    expect(isPermanentRecipientError({ code: "EENVELOPE", responseCode: 450, rejected: ["a@b.c"] })).toBe(false);
  });
});
