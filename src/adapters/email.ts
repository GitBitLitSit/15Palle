import QRCode from "qrcode";
import * as nodemailer from "nodemailer";

const ZEPTO_SMTP_HOST = "smtp.zeptomail.eu";
const ZEPTO_SMTP_PORT = 587;
const ZEPTO_SMTP_USER = "emailapikey";

const getZeptoTransporter = () => {
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
  });
};

export const sendQrCodeEmail = async (
  sourceMail: string,
  firstName: string,
  lastName: string,
  email: string,
  qrUuid: string
) => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(qrUuid);

    const transporter = getZeptoTransporter();

    const cid = qrUuid;

    const info = await transporter.sendMail({
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
    });

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