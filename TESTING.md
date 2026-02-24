# Testing

Run tests to quickly check that existing behaviour still works when you add or change features.

## Run all tests

From the project root:

```bash
npm run test        # Backend (Lambda handlers + email adapter)
npm run test:watch  # Backend in watch mode
npm run test:all    # Backend + frontend
```

From the frontend folder:

```bash
cd frontend && npm run test       # Frontend (API client + UI)
cd frontend && npm run test:watch # Frontend in watch mode
```

## What’s covered

### Backend (Vitest)

- **API handlers** (API Gateway V2 style): auth (login, request-verification), members (create, get, update, delete, export CSV, reset QR, recover), access (check-ins GET, check-in POST). Handlers run with a **mocked DB** (in-memory) and **mocked email** where applicable.
- **Email adapter** (`src/adapters/email.ts`): `sendQrCodeEmail` and `sendVerificationEmail` are unit-tested with a **mocked Nodemailer transport**. Tests assert:
  - Correct `to`, `from`, `subject`
  - Body content (e.g. recipient name, verification code, QR code email copy)

So **yes, emails are testable**: we don’t send real emails; we mock the transport and assert that the right emails would be sent with the right content.

### Frontend (Vitest + React Testing Library)

- **API client** (`frontend/lib/api.ts`): All public API functions are tested with **mocked `fetch`** (correct URL, method, headers, body).
- **UI**: Button component (render, click, disabled, `asChild`).

## Adding tests when you add a feature

1. **New API endpoint**  
   Add a test file next to the handler, e.g. `src/handlers/members/myNew.handler.ts` → `src/handlers/members/myNew.test.ts`. Use `createApiEvent` from `src/test/eventHelper.ts` and the same DB/email mocking pattern as in existing handler tests.

2. **New email type**  
   In `src/adapters/email.test.ts`, add a test that mocks the transporter and asserts the new function calls `sendMail` with the expected options and body content.

3. **New frontend API call**  
   In `frontend/lib/api.test.ts`, add a test that mocks `fetch` and asserts the new function calls the correct URL, method, and body.

4. **New component**  
   Add `ComponentName.test.tsx` next to the component and use `render` / `screen` from `@testing-library/react`.
