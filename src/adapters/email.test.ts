import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMailMock = vi.hoisted(() => vi.fn());
vi.mock("nodemailer", () => ({
  createTransport: () => ({
    sendMail: (opts: any) => sendMailMock(opts),
  }),
}));

// QRCode.toDataURL is used by sendQrCodeEmail
vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,fakeqr"),
  },
}));

const { sendQrCodeEmail, sendVerificationEmail } = await import("./email");

describe("email adapter", () => {
  beforeEach(() => {
    process.env.MAIL_API_KEY = "test-key";
    sendMailMock.mockReset();
    sendMailMock.mockResolvedValue({ messageId: "test-id" });
  });

  describe("sendQrCodeEmail", () => {
    it("sends mail with correct to, from, subject and recipient name in body", async () => {
      const result = await sendQrCodeEmail(
        "noreply@club.com",
        "Mario",
        "Rossi",
        "mario@example.com",
        "qr-uuid-123"
      );
      expect(result.success).toBe(true);
      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const call = sendMailMock.mock.calls[0][0];
      expect(call.from).toBe("noreply@club.com");
      expect(call.to).toBe("mario@example.com");
      expect(call.subject).toBe("Il tuo QR code per 15 Palle");
      expect(call.html).toContain("Mario");
      expect(call.html).toContain("15 Palle");
      expect(call.text).toContain("Mario");
      expect(call.text).toContain("Rossi");
    });

  });

  describe("sendVerificationEmail", () => {
    it("sends mail with verification code and first name", async () => {
      const result = await sendVerificationEmail(
        "noreply@club.com",
        "user@example.com",
        "123456",
        "Luigi"
      );
      expect(result.success).toBe(true);
      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const call = sendMailMock.mock.calls[0][0];
      expect(call.from).toBe("noreply@club.com");
      expect(call.to).toBe("user@example.com");
      expect(call.subject).toContain("codice di verifica");
      expect(call.html).toContain("Luigi");
      expect(call.html).toContain("123456");
      expect(call.text).toContain("123456");
    });
  });
});
