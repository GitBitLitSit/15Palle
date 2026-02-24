import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/i18n", () => ({ getApiLanguage: () => "en", default: { language: "en" } }));

import {
  loginAdmin,
  createMember,
  getMembers,
  deleteMember,
  requestVerificationCode,
  verifyAndRecover,
  getCheckIns,
  updateMember,
  resetQrCode,
  exportMembersCsv,
  bulkCreateUsers,
  checkExistingUsers,
  importMembersBatch,
} from "./api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.test";

describe("api client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it("loginAdmin calls POST /admin/login with credentials", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: "LOGIN_SUCCESSFUL", token: "jwt-123" }),
    });
    const result = await loginAdmin({ username: "admin", password: "secret" });
    expect(result).toEqual({ message: "LOGIN_SUCCESSFUL", token: "jwt-123" });
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/admin/login`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "admin", password: "secret" }),
      })
    );
  });

  it("createMember calls POST /members with auth header when token in localStorage", async () => {
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => "token-xyz"), setItem: vi.fn(), removeItem: vi.fn() });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: "MEMBER_CREATED", memberId: "id1" }),
    });
    await createMember({
      firstName: "Mario",
      lastName: "Rossi",
      email: "mario@test.com",
      sendEmail: false,
    });
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/members`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token-xyz" }),
        body: JSON.stringify({
          firstName: "Mario",
          lastName: "Rossi",
          email: "mario@test.com",
          sendEmail: false,
        }),
      })
    );
  });

  it("getMembers builds correct query string", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [], pagination: { total: 0, page: 2, limit: 10 } }),
    });
    await getMembers(2, "john", true, "10");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("page=2"),
      expect.any(Object)
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("search=john"),
      expect.any(Object)
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("blocked=true"),
      expect.any(Object)
    );
  });

  it("deleteMember calls DELETE /members/:id", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    await deleteMember("member-id-123");
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/members/member-id-123`,
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("requestVerificationCode calls POST /auth/request-verification", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: "IF_ACCOUNT_EXISTS" }),
    });
    await requestVerificationCode("user@example.com");
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/auth/request-verification`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      })
    );
  });

  it("verifyAndRecover calls POST /members/recover with deliveryMethod", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, member: {}, qrImage: "data:..." }),
    });
    await verifyAndRecover({
      email: "u@test.com",
      verificationCode: "123456",
      deliveryMethod: "display",
    });
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/members/recover`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "u@test.com",
          verificationCode: "123456",
          deliveryMethod: "display",
        }),
      })
    );
  });

  it("getCheckIns calls GET /auth/check-ins with page and limit", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [], pagination: {} }),
    });
    await getCheckIns(1, 50);
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/auth/check-ins?page=1&limit=50`,
      expect.any(Object)
    );
  });

  it("updateMember calls PUT /members/:id", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, member: {} }),
    });
    await updateMember("id-1", {
      firstName: "A",
      lastName: "B",
      email: "a@b.com",
      blocked: false,
    });
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/members/id-1`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ firstName: "A", lastName: "B", email: "a@b.com", blocked: false }),
      })
    );
  });

  it("resetQrCode calls POST /members/reset-qrcode", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, qrUuid: "new-uuid" }),
    });
    await resetQrCode("member-id");
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/members/reset-qrcode`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ id: "member-id" }),
      })
    );
  });

  it("exportMembersCsv returns blob", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(["csv,data"])),
    });
    const blob = await exportMembersCsv();
    expect(blob).toBeInstanceOf(Blob);
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/members/export`,
      expect.objectContaining({ method: "GET" })
    );
  });

  it("bulkCreateUsers calls POST /bulk-create-users", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ inserted: 2, invalid: 0 }),
    });
    await bulkCreateUsers([
      { firstName: "A", lastName: "B", email: "a@b.com" },
      { firstName: "C", lastName: "D", email: "c@d.com", sendEmail: true },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/bulk-create-users`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          users: [
            { firstName: "A", lastName: "B", email: "a@b.com" },
            { firstName: "C", lastName: "D", email: "c@d.com", sendEmail: true },
          ],
        }),
      })
    );
  });

  it("checkExistingUsers calls POST /check-existing-users", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ existingEmails: ["a@b.com"] }),
    });
    await checkExistingUsers(["a@b.com", "c@d.com"]);
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/check-existing-users`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ emails: ["a@b.com", "c@d.com"] }),
      })
    );
  });

  it("importMembersBatch calls POST /members/import/batch", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, inserted: 1 }),
    });
    await importMembersBatch([
      { firstName: "X", lastName: "Y", email: "x@y.com" },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/members/import/batch`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          members: [{ firstName: "X", lastName: "Y", email: "x@y.com" }],
        }),
      })
    );
  });

  it("throws when response not ok", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "NO_TOKEN_PROVIDED" }),
    });
    await expect(createMember({ firstName: "A", lastName: "B", email: "a@b.com", sendEmail: false })).rejects.toThrow();
  });
});
