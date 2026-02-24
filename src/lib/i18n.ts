import i18next from "i18next";

export const SUPPORTED_LANGUAGES = ["it", "en", "de"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = {
  it: {
    translation: {
      errors: {
        NO_TOKEN_PROVIDED: "Token mancante.",
        INTERNAL_SERVER_ERROR: "Errore interno del server.",
        QRUUID_REQUIRED: "Il codice QR è obbligatorio.",
        NO_VALID_CREDENTIALS: "Credenziali non valide.",
        INVALID_TOKEN: "Token non valido o scaduto.",
        MEMBER_ID_REQUIRED_IN_PATH: "ID membro mancante nel percorso.",
        MEMBER_ID_REQUIRED: "ID membro obbligatorio.",
        INVALID_MEMBER_ID_FORMAT: "Formato ID membro non valido.",
        MEMBER_NOT_FOUND: "Membro non trovato.",
        MEMBER_BLOCKED: "Il membro è bloccato.",
        MEMBER_EMAIL_EXISTS: "Esiste già un membro con questa email.",
        MEMBER_REQUIRED: "Nome, cognome, email e opzione invio email sono obbligatori.",
        INVALID_EMAIL_FORMAT: "Formato email non valido.",
        EMAIL_REQUIRED: "Email obbligatoria.",
        EMAILS_REQUIRED: "Elenco email mancante.",
        USERS_REQUIRED: "Elenco utenti mancante.",
        EMAIL_AND_CONFIRMATION_CODE: "Email e codice di verifica sono obbligatori.",
        INVALID_EMAIL_OR_CODE: "Email o codice non validi.",
        CODE_EXPIRED: "Il codice è scaduto.",
        INVALID_CODE: "Codice non valido.",
        MISSING_CREDENTIALS: "Nome utente e password sono obbligatori.",
        INVALID_CREDENTIALS: "Credenziali non valide.",
        TOO_MANY_ATTEMPTS: "Troppi tentativi. Riprova tra {{minutes}} minuti.",
        CSV_REQUIRED: "File CSV mancante.",
        CSV_INVALID: "Formato CSV non valido.",
        IMPORT_BATCH_REQUIRED: "Batch di import mancante o non valido.",
        IMPORT_BATCH_TOO_LARGE: "Batch troppo grande (max {{max}}).",
      },
      messages: {
        IF_ACCOUNT_EXISTS: "Se l'account esiste, invieremo un codice di verifica.",
        LOGIN_SUCCESSFUL: "Accesso effettuato con successo.",
        ACCESS_GRANTED: "Accesso consentito.",
        MEMBER_CREATED: "Membro creato con successo.",
        MEMBER_CREATED_EMAIL_SUCCESS: "Membro creato e email inviata.",
        MEMBER_CREATED_EMAIL_FAILED: "Membro creato, ma l'invio dell'email non è riuscito.",
        QR_CODE_RESET_SUCCESS: "QR code rigenerato con successo.",
        QR_CODE_SEND_TO_EMAIL: "QR code inviato via email.",
        CODE_VERIFIED_SUCCESSFULLY: "Codice verificato con successo.",
      },
      warnings: {
        INVALID_QR: "Accesso negato: QR non valido / membro non trovato.",
        MEMBER_BLOCKED: "Accesso negato: il membro è bloccato.",
      },
    },
  },
  en: {
    translation: {
      errors: {
        NO_TOKEN_PROVIDED: "Missing token.",
        INTERNAL_SERVER_ERROR: "Internal server error.",
        QRUUID_REQUIRED: "QR code is required.",
        NO_VALID_CREDENTIALS: "Invalid credentials.",
        INVALID_TOKEN: "Invalid or expired token.",
        MEMBER_ID_REQUIRED_IN_PATH: "Missing member id in path.",
        MEMBER_ID_REQUIRED: "Member id is required.",
        INVALID_MEMBER_ID_FORMAT: "Invalid member id format.",
        MEMBER_NOT_FOUND: "Member not found.",
        MEMBER_BLOCKED: "Member is blocked.",
        MEMBER_EMAIL_EXISTS: "A member with this email already exists.",
        MEMBER_REQUIRED: "First name, last name, email and sendEmail are required.",
        INVALID_EMAIL_FORMAT: "Invalid email format.",
        EMAIL_REQUIRED: "Email is required.",
        EMAILS_REQUIRED: "Email list is required.",
        USERS_REQUIRED: "User list is required.",
        EMAIL_AND_CONFIRMATION_CODE: "Email and verification code are required.",
        INVALID_EMAIL_OR_CODE: "Invalid email or code.",
        CODE_EXPIRED: "The code has expired.",
        INVALID_CODE: "Invalid code.",
        MISSING_CREDENTIALS: "Username and password are required.",
        INVALID_CREDENTIALS: "Invalid credentials.",
        TOO_MANY_ATTEMPTS: "Too many attempts. Try again in {{minutes}} minutes.",
        CSV_REQUIRED: "Missing CSV file.",
        CSV_INVALID: "Invalid CSV format.",
        IMPORT_BATCH_REQUIRED: "Missing or invalid import batch.",
        IMPORT_BATCH_TOO_LARGE: "Import batch too large (max {{max}}).",
      },
      messages: {
        IF_ACCOUNT_EXISTS: "If the account exists, we will send a verification code.",
        LOGIN_SUCCESSFUL: "Login successful.",
        ACCESS_GRANTED: "Access granted.",
        MEMBER_CREATED: "Member created successfully.",
        MEMBER_CREATED_EMAIL_SUCCESS: "Member created and email sent.",
        MEMBER_CREATED_EMAIL_FAILED: "Member created, but email sending failed.",
        QR_CODE_RESET_SUCCESS: "QR code reset successfully.",
        QR_CODE_SEND_TO_EMAIL: "QR code sent to email.",
        CODE_VERIFIED_SUCCESSFULLY: "Code verified successfully.",
      },
      warnings: {
        INVALID_QR: "Access denied: invalid QR / member not found.",
        MEMBER_BLOCKED: "Access denied: member is blocked.",
      },
    },
  },
  de: {
    translation: {
      errors: {
        NO_TOKEN_PROVIDED: "Token fehlt.",
        INTERNAL_SERVER_ERROR: "Interner Serverfehler.",
        QRUUID_REQUIRED: "QR-Code ist erforderlich.",
        NO_VALID_CREDENTIALS: "Ungültige Zugangsdaten.",
        INVALID_TOKEN: "Token ist ungültig oder abgelaufen.",
        MEMBER_ID_REQUIRED_IN_PATH: "Mitglieds-ID fehlt im Pfad.",
        MEMBER_ID_REQUIRED: "Mitglieds-ID ist erforderlich.",
        INVALID_MEMBER_ID_FORMAT: "Ungültiges Mitglieds-ID-Format.",
        MEMBER_NOT_FOUND: "Mitglied nicht gefunden.",
        MEMBER_BLOCKED: "Mitglied ist gesperrt.",
        MEMBER_EMAIL_EXISTS: "Ein Mitglied mit dieser E-Mail existiert bereits.",
        MEMBER_REQUIRED: "Vorname, Nachname, E-Mail und sendEmail sind erforderlich.",
        INVALID_EMAIL_FORMAT: "Ungültiges E-Mail-Format.",
        EMAIL_REQUIRED: "E-Mail ist erforderlich.",
        EMAILS_REQUIRED: "E-Mail-Liste fehlt.",
        USERS_REQUIRED: "Benutzerliste fehlt.",
        EMAIL_AND_CONFIRMATION_CODE: "E-Mail und Bestätigungscode sind erforderlich.",
        INVALID_EMAIL_OR_CODE: "Ungültige E-Mail oder Code.",
        CODE_EXPIRED: "Der Code ist abgelaufen.",
        INVALID_CODE: "Ungültiger Code.",
        MISSING_CREDENTIALS: "Benutzername und Passwort sind erforderlich.",
        INVALID_CREDENTIALS: "Ungültige Zugangsdaten.",
        TOO_MANY_ATTEMPTS: "Zu viele Versuche. Bitte in {{minutes}} Minuten erneut versuchen.",
        CSV_REQUIRED: "CSV-Datei fehlt.",
        CSV_INVALID: "Ungültiges CSV-Format.",
        IMPORT_BATCH_REQUIRED: "Import-Batch fehlt oder ist ungültig.",
        IMPORT_BATCH_TOO_LARGE: "Import-Batch ist zu groß (max {{max}}).",
      },
      messages: {
        IF_ACCOUNT_EXISTS: "Wenn das Konto existiert, senden wir einen Bestätigungscode.",
        LOGIN_SUCCESSFUL: "Anmeldung erfolgreich.",
        ACCESS_GRANTED: "Zugang gewährt.",
        MEMBER_CREATED: "Mitglied erfolgreich erstellt.",
        MEMBER_CREATED_EMAIL_SUCCESS: "Mitglied erstellt und E-Mail gesendet.",
        MEMBER_CREATED_EMAIL_FAILED: "Mitglied erstellt, aber E-Mail konnte nicht gesendet werden.",
        QR_CODE_RESET_SUCCESS: "QR-Code erfolgreich zurückgesetzt.",
        QR_CODE_SEND_TO_EMAIL: "QR-Code per E-Mail gesendet.",
        CODE_VERIFIED_SUCCESSFULLY: "Code erfolgreich bestätigt.",
      },
      warnings: {
        INVALID_QR: "Zugriff verweigert: Ungültiger QR / Mitglied nicht gefunden.",
        MEMBER_BLOCKED: "Zugriff verweigert: Mitglied ist gesperrt.",
      },
    },
  },
} as const;

let initialized = false;
function ensureInitialized() {
  if (initialized) return;
  i18next.init({
    resources: resources as any,
    fallbackLng: "it",
    lng: "it",
    initImmediate: false,
    interpolation: { escapeValue: false },
  });
  initialized = true;
}

export function normalizeLanguage(language?: string | null): SupportedLanguage {
  const l = (language || "").toLowerCase().trim();
  const base = l.split("-")[0];
  if (base === "it" || base === "en" || base === "de") return base;
  return "it";
}

export function getLanguageFromAcceptLanguageHeader(acceptLanguage?: string | null): SupportedLanguage {
  const raw = (acceptLanguage || "").trim();
  if (!raw) return "it";

  // Example: "de-DE,de;q=0.9,en;q=0.8"
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.split(";")[0]?.trim())
    .filter(Boolean);

  for (const p of parts) {
    const normalized = normalizeLanguage(p);
    if (SUPPORTED_LANGUAGES.includes(normalized)) return normalized;
  }
  return "it";
}

export function t(language: string | null | undefined, key: string, options?: Record<string, unknown>) {
  ensureInitialized();
  const lang = normalizeLanguage(language);
  const fixedT = i18next.getFixedT(lang);
  return fixedT(key, options);
}

