import QRCode from "qrcode";
import * as nodemailer from "nodemailer";

const ZEPTO_SMTP_HOST = "smtp.zeptomail.eu";
const ZEPTO_SMTP_PORT = 587;
const ZEPTO_SMTP_USER = "emailapikey";

const getZeptoTransporter = () => createMailTransport();

/**
 * With `pool: true` one SMTP connection is reused for many mails (used by the queue sender).
 * Pooled transports must be closed with `transporter.close()` when done.
 */
export const createMailTransport = (options?: { pool?: boolean }) => {
  const mailApiKey = process.env.MAIL_API_KEY;
  if (!mailApiKey) {
    throw new Error("MAIL_API_KEY is not set");
  }

  return nodemailer.createTransport({
    host: ZEPTO_SMTP_HOST,
    port: ZEPTO_SMTP_PORT,
    secure: false,
    auth: {
      user: ZEPTO_SMTP_USER,
      pass: mailApiKey,
    },
    ...(options?.pool ? { pool: true, maxConnections: 2 } : {}),
  });
};

export const buildQrCodeMail = async (
  sourceMail: string,
  firstName: string,
  lastName: string,
  email: string,
  qrUuid: string
) => {
  const qrCodeDataUrl = await QRCode.toDataURL(qrUuid);
  const cid = qrUuid;

  return {
    from: sourceMail,
    to: email,
    subject: "Il tuo QR code per 15 Palle",
    html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Ciao ${firstName},</h2>
          <p>Benvenuto al club di biliardo 15 Palle!</p>
          <p>Di seguito trovi il tuo QR code personale. Ti servira per accedere alla struttura.</p>
          
          <div style="margin: 20px 0;">
            <img src="cid:${cid}" alt="Il tuo QR code" style="width: 200px; height: 200px; border: 1px solid #ccc;" />
          </div>

          <p>Se non riesci a visualizzare l'immagine, contatta il supporto.</p>
          <p>Grazie,<br>Il team di 15 Palle</p>
        </div>
      `,
    text: `Ciao ${firstName} ${lastName}, trovi in allegato il tuo QR code personale.`,
    attachments: [
      {
        filename: "qrcode.png",
        path: qrCodeDataUrl,
        cid: cid
      },
    ],
  };
};

export const sendQrCodeEmail = async (
  sourceMail: string,
  firstName: string,
  lastName: string,
  email: string,
  qrUuid: string
) => {
  try {
    const transporter = getZeptoTransporter();
    const info = await transporter.sendMail(
      await buildQrCodeMail(sourceMail, firstName, lastName, email, qrUuid)
    );

    return { success: true, data: info };
  } catch {
    return { success: false };
  }
};

export const sendVerificationEmail = async (
    sourceMail: string,
    email: string,
    verificationCode: string,
    firstName: string
) => {
    try {
        const transporter = getZeptoTransporter();

        const info = await transporter.sendMail({
            from: sourceMail,
            to: email,
            subject: "Il tuo codice di verifica - 15 Palle",
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Ciao ${firstName},</h2>
                    <p>Hai richiesto un codice di verifica per accedere al tuo account.</p>
                    <div style="background-color: #f4f4f4; padding: 15px; font-size: 24px; letter-spacing: 5px; text-align: center; margin: 20px 0; font-weight: bold;">
                        ${verificationCode}
                    </div>
                    <p>Il codice scade tra 15 minuti.</p>
                    <p>Se non hai richiesto questo codice, ignora questa email.</p>
                    <p>Grazie,<br>Il team di 15 Palle</p>
                </div>
            `,
            text: `Ciao ${firstName}, il tuo codice di verifica e': ${verificationCode}. Scade tra 15 minuti.`
        });

        return { success: true, data: info };

    } catch {
        return { success: false };
    }
};
export type ImportNotificationSummary = {
    inserted: number;
    invalid: number;
    duplicates?: number;
    emailQueued: number;
    emailQueueFailed: number;
    durationMs: number;
    actor?: string;
};

/** Internal notice to the operator when a larger import runs, to watch how the email queue behaves. */
export const sendImportNotificationEmail = async (
    sourceMail: string,
    to: string,
    summary: ImportNotificationSummary
) => {
    try {
        const transporter = getZeptoTransporter();
        const rows: Array<[string, string | number]> = [
            ["Zeitpunkt", new Date().toISOString()],
            ["Angelegt von", summary.actor ?? "-"],
            ["Neue Mitglieder", summary.inserted],
            ["Ungültige Zeilen", summary.invalid],
            ["Duplikate", summary.duplicates ?? 0],
            ["Mails in Queue", summary.emailQueued],
            ["Mails nicht eingereiht", summary.emailQueueFailed],
            ["Dauer Import-Lambda", `${summary.durationMs} ms`],
        ];

        const info = await transporter.sendMail({
            from: sourceMail,
            to,
            subject: `15 Palle Import: ${summary.inserted} neue Mitglieder`,
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Import abgeschlossen</h2>
                    <table style="border-collapse: collapse;">
                        ${rows.map(([label, value]) => `<tr><td style="padding: 4px 12px 4px 0;">${label}</td><td style="padding: 4px 0;"><b>${value}</b></td></tr>`).join("")}
                    </table>
                    <p>Die QR-Mails werden jetzt über die Queue verschickt. Der Status der Mitglieder wechselt in den nächsten Minuten von "In attesa" auf "Attivo" bzw. "Non valida".</p>
                </div>
            `,
            text: rows.map(([label, value]) => `${label}: ${value}`).join("\n"),
        });

        return { success: true, data: info };
    } catch {
        return { success: false };
    }
};
