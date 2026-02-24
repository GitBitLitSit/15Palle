import { beforeAll, vi } from "vitest";

beforeAll(() => {
  process.env.JWT_SECRET_KEY = "test-jwt-secret-key-for-tests";
  process.env.ADMIN_USERNAME = "admin";
  process.env.ADMIN_PASSWORD = "admin123";
  process.env.MONGODB_URI = "mongodb://localhost:27017";
  process.env.MONGODB_DB_NAME = "test-db";
  process.env.SES_SENDER_EMAIL = "noreply@test.com";
  process.env.MAIL_API_KEY = "test-mail-api-key";
  process.env.RASPBERRY_PI_API_KEY = "test-pi-key";
});
