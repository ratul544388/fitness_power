# FITNESS POWER — Gym Operations Platform

A full-stack, dark/light-mode Next.js application for running a gym. The UI takes its inspiration from the supplied Fitness Power screenshots, with a redesigned, responsive command-center experience. Its live mode uses **Neon Postgres + Drizzle ORM**, **Better Auth**, and **Cloudinary**. A separate, explicitly marked, **development-only local demo** makes it possible to explore the UI without cloud credentials.

> **Status:** Source implementation provided. A local TypeScript/TSX syntax pass has been performed. The package registry was not reachable in the authoring environment, so dependency installation, full type-checking, production compilation, and end-to-end testing against your real Neon/Cloudinary accounts **have not yet been executed**. Please complete the verification checklist below before using real member or financial data.

## Included modules

| Section | Capabilities |
| --- | --- |
| Overview | KPIs, recent collections, expiry alerts, membership mix, attendance, revenue vs. expense trends, and shortcuts |
| Members | Register member with first membership/payment, update profile, profile drawer, archive, search/filter/sort, select multiple, table/grid, export CSV, preview and import legacy CSV, membership renewal |
| Membership Plans | Create/update/deactivate plans, pricing and durations, current member counts, table/grid, CSV export |
| Payments | Record membership and other receipts, cash/bKash/Nagad/bank/card method, references, read-only payment ledger, CSV export |
| Attendance | Manual check-in and check-out, active occupancy, visit history, eligibility checks, CSV export |
| Lockers | Locker zones and sizes, visual tile/grid and table, assignments and releases, maintenance status and occupancy |
| Staff | Staff directory, job role, shift, salary, start date, contact information, photo upload, table/grid |
| Expenses | Expense categories, cost/date/method/vendor, Cloudinary receipt images, edit/delete with audit records, CSV |
| Reports | Monthly revenue/expense charts, membership distribution, operating metrics and CSV data exports |
| Activity | Audit trail of creation, updates, renewals, payments, check-ins, assignments, and deletions |
| Team Access | Private user creation with credentials; owner/admin/manager/receptionist/viewer roles; revoke sessions on role change or account disable |
| Settings | Gym name/contact, admission fee, currency, gym timezone for overview date aggregation, light/dark preference and personal password change |

## Technology

- Next.js 16 App Router, TypeScript, React 19
- Neon serverless Postgres (`@neondatabase/serverless` Pool/WebSocket) with Drizzle ORM
- Better Auth (cookie sessions, username/password accounts; public signup disabled)
- Cloudinary server-side upload API (only authenticated staff can upload; content type, signatures, size checked)
- SWR for client caching, Motion for modal animation, Recharts for dashboard charts, `next-themes` for dark/light appearance, Lucide icons
- Zod validation for protected API inputs

## Prerequisites

1. **Node.js 22 LTS** or another version supported by Next.js 16 (Node 20.9+ minimum).
2. A **Neon Postgres** project: <https://console.neon.tech/>.
3. A **Cloudinary** account for member/staff photos and expense receipts: <https://console.cloudinary.com/>.
4. Optionally a Vercel account or another host that supports persistent Postgres connectivity and Node.js runtime.

**You do not need to send your Neon API key.** For this application, use the Neon **PostgreSQL connection string** found in the Neon dashboard under **Connect / Connection details**. Use its **pooled** connection hostname (`-pooler`) and keep `sslmode=require` on the connection. No Neon management API key is needed.

## Installation and configuration

```bash
# Extract the project archive, then:
cd fitness-power
npm install

# macOS/Linux:
cp .env.example .env.local
# Windows PowerShell:
# Copy-Item .env.example .env.local
```

### TypeScript fix for the first Windows installation (8 errors)

The current source package fixes the eight `npm run typecheck` errors originally seen in `src/components/operations.tsx`, `src/lib/demo.ts`, and `src/app/api/import/members/route.ts` by correcting two shared typings: `useResource()` returns an explicitly typed list, and `demoCreate()` types dynamically constructed records as `Row`.

If you have **already installed npm dependencies** for the earlier archive, you can use the separate `fitness-power-typescript-patch.zip` to replace only `src/components/hooks.ts` and `src/lib/demo.ts` (preserving their `src/` folder structure). Stop `npm run dev` with Ctrl+C before copying. **No additional npm install is necessary** for this two-file source patch. Run `npm run typecheck` and `npm run dev` afterward.

The source files have been syntax-transpiled, but a full local TypeScript type check is still pending because the build environment cannot access npm to install the required dependencies. Report any additional errors if your local type check fails.

### Next.js 16 client/server boundary fix (`next/headers`)

This edition fixes the Turbopack error that incorrectly refers to the Pages Router when a Client Component imports `src/lib/permissions.ts`. The application uses the App Router. The previous permissions module mixed server session/database imports with the UI-safe `can()` helper. In this release:

- `src/lib/access.ts` holds shared role types and the pure permission check function.
- `src/lib/permissions.ts` holds server-only session/database functions (`getActor`, `requireActor`, etc.).
- Client Components import `can` and `Actor` from `@/lib/access`, **never** from `@/lib/permissions`.
- API endpoints continue to enforce access rules on the server; the UI checks are only a presentation aid.

If upgrading from the previous *TypeScript-fixed* edition, extract `fitness-power-router-boundary-patch.zip` into the **root** of your existing project (so its `src` folder overlays your project's `src` folder). Replacing only `permissions.ts` without updating the components **will not** work. Stop the dev server first. Dependencies do not change, so `npm install` is unnecessary. Check:

```powershell
npm run typecheck
npm run dev
```

If Turbopack continues to show the old import after replacing files, stop the dev server, delete the generated `.next` directory (`Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue`), and start it again.

### npm dependency resolution notes (Windows / PowerShell)

The corrected project pins the compatible peer dependency ranges `drizzle-orm@^0.45.2` and `drizzle-kit@^0.31.4` for `better-auth@1.7.18`. The original archive used `drizzle-orm@^0.44.0` and could fail with `ERESOLVE`.

If you already tried installing the **older** archive, use the corrected archive or run:

```powershell
npm pkg set "dependencies.drizzle-orm=^0.45.2"
npm pkg set "devDependencies.drizzle-kit=^0.31.4"
npm install
```

If npm still reads a previous lockfile or partial install, clear the local install and retry:

```powershell
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
npm install
```

Do not use `--force` or `--legacy-peer-deps` to conceal a dependency conflict. If installation still fails, share the **first 20 lines** around `ERESOLVE` (including `Found:` and `Could not resolve dependency:`); these identify the exact remaining package mismatch.

Open `.env.local` and fill the fields:

| Environment variable | Where to get the value |
| --- | --- |
| `DATABASE_URL` | Neon dashboard → Connect → **pooled connection string**; PostgreSQL URL, not API key |
| `BETTER_AUTH_SECRET` | Locally generate a random 32+-character secret with `openssl rand -base64 48` or `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| `BETTER_AUTH_URL` | `http://localhost:3000` locally; your exact `https://...` root URL on production |
| `BOOTSTRAP_OWNER_EMAIL` | Your initial owner login email |
| `BOOTSTRAP_OWNER_NAME` | Your name or your gym administrator's name |
| `BOOTSTRAP_OWNER_PASSWORD` | A unique, strong password of **at least 16 characters**, used for the one-time bootstrap |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard → API environment |
| `CLOUDINARY_API_KEY` | Cloudinary dashboard → API environment |
| `CLOUDINARY_API_SECRET` | Cloudinary dashboard → API environment (server secret; never put it in browser code) |
| `DEMO_MODE` | Set `false` for real use. `true` provides a **development-only, ephemeral local preview** |

**Do not commit `.env.local`, secrets, member exports, or real member photos to Git.** `.gitignore` ignores dotenv local files and dependencies. Rotate a secret if accidentally exposed.

### Create the database and first owner

```bash
# Applies all defined tables in a new development database:
npm run db:push

# Creates the only owner account. Refuses a second owner or existing email:
npm run db:bootstrap

# Creates four default plans and 32 empty lockers (no fake transactions):
npm run db:seed

npm run dev
```

Open **http://localhost:3000** and sign in with the `BOOTSTRAP_OWNER_EMAIL` and `BOOTSTRAP_OWNER_PASSWORD` you supplied. After a successful one-time bootstrap, **remove `BOOTSTRAP_OWNER_PASSWORD` from the host environment** and store it securely.

**Production migrations:** `db:push` is for a new development DB. For subsequent schema changes, review generated SQL and use:

```bash
npm run db:generate
npm run db:migrate
```

Keep migration files in version control and take a Neon restore-point/branch before applying changes to real data.

### Explore without cloud credentials

```bash
# In .env.local set DEMO_MODE="true"
npm run dev
```

Go to **http://localhost:3000/login**, then select **Explore local preview**. The dashboard will contain sample members, plans, staff, locker assignments, payments, expenses, and attendance. CRUD interactions are local **in-memory samples only**; they do **not** represent a real database and are reset when the dev server restarts/reloads. Demo authentication bypass is **disabled** for production builds by construction (`NODE_ENV === "development"`). Never use demo mode for real member data.

When ready for real records, set `DEMO_MODE="false"`, fill `DATABASE_URL`, run the database setup commands, and sign in as owner.

## Normal gym workflow

1. Owner signs in, optionally edits gym details and admission fee under **Settings**.
2. Owner/admin creates dashboard users from **Team Access**. These users get a temporary password and can change it under **Settings → Personal security**; no public registration exists.
3. Create/edit **Membership Plans** and define durations/prices.
4. **Members → Add member** captures the profile, plan, date, optional discount, and amount paid. The first membership period and payment are written atomically; remaining dues can be paid later in **Payments**.
5. Use **Members → Renew** to create a new, history-preserving membership period. A suggested new start date preserves unused remaining days if you keep the prefilled value; dates are explicitly editable.
6. **Attendance** records member entry/exit; expired, inactive and frozen memberships cannot check in.
7. **Lockers** assigns or releases available lockers, with validation against active membership and occupancy.
8. Record staff shifts/salaries, expense transactions/receipts, and revenue payments. Use **Reports** and **Activity Log** for analysis and audit.
9. Use **CSV export** to back up lists or **Members → Import CSV** to migrate legacy members, preserving dates and member numbers where supplied.

### Legacy member CSV import

Download the **CSV template** inside **Members → Import CSV**. Required headers:

```csv
member_no,name,phone,email,gender,plan,start_date,expire_date,status,address,notes
101,Sample Person,01XXXXXXXXX,,male,Essential,2026-11-01,2026-12-01,active,,
```

- Create the plans first; `plan` must match an existing plan name (case insensitive).
- Use `YYYY-MM-DD` dates; `member_no` is optional, and duplicate member numbers are skipped.
- Files are restricted to **2 MB** and **1,500 rows** per upload. The preview validates all rows before the import.
- CSV import stores members and existing start/expiry dates **without manufacturing historical payment records**. Import payments separately in a future migration if you have them; do not count legacy membership prices as collected revenue by default.
- Only owner/admin/manager may import. This action is audited.

## Team permissions

| Role | Abilities |
| --- | --- |
| Owner | Full access. The bootstrap owner account cannot be reassigned, disabled, or archived from Team Access |
| Admin | Full operational permissions and team access; cannot modify the owner account |
| Manager | Member/membership, attendance, plan, locker, staff, expense and payment operations; no account/settings control |
| Receptionist | Member, attendance, locker and payment operations; limited access to staff/plan editing |
| Viewer | Read-only access, including reports, with no mutation permissions |

Roles are enforced on the **server** for every protected API request, not just hidden in the UI. Role changes and disabling users revoke their sessions. Note: this is a **single-gym** instance; tenants/branches would need additional ownership scoping in the schema and queries.

## API reference (internal, authenticated)

| Endpoint | Methods | Description |
| --- | --- | --- |
| `/api/auth/*` | Better Auth | Login, logout, session, change password |
| `/api/me` | GET | Current actor |
| `/api/overview` | GET | Dashboard metrics and chart data |
| `/api/resources/[resource]` | GET / POST / PATCH / DELETE | Permission-checked CRUD (`members`, `plans`, `payments`, `attendance`, `lockers`, `staff`, `expenses`, `settings`, `team`, `audit`) |
| `/api/actions` | POST | `renew`, `checkin`, `checkout`, `locker-assign`, `locker-release` |
| `/api/upload` | POST | Cloudinary photo/receipt upload (multipart/form-data) |
| `/api/export/[resource]` | GET | CSV export with formula-injection safety |
| `/api/import/members` | POST | Validated CSV upload; `dryRun=true` previews |

## Production deployment

1. Install dependencies locally and run `npm run typecheck` and `npm run build` successfully.
2. Test against a **separate Neon staging branch**, not your live records.
3. Review and apply migrations, then bootstrap the first owner against production **one time**.
4. Deploy to Vercel or another Node.js-capable host; set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, Cloudinary credentials, and `DEMO_MODE=false` in **server-side environment settings** (never public `NEXT_PUBLIC_` variables).
5. Set the exact HTTPS origin in `BETTER_AUTH_URL`. Keep TLS/HTTPS enabled.
6. Confirm authenticated `/api/resources/...` requests, Cloudinary uploads, membership renewals, simultaneous locker assignments and check-ins, finance sums, reports, and CSV import/export.
7. Enable Neon backups/PITR (according to your plan), Cloudinary media access controls, monitoring, and normal operational access reviews.
8. Run `npm audit` and update dependencies before launching.

### Verification checklist

- [ ] `npm install` completes; then `npm run typecheck` and `npm run build` pass.
- [ ] Owner can sign in and sign out; public sign-up is disabled.
- [ ] Owner can create a user; receptionist cannot access team APIs; viewer cannot write.
- [ ] New member creates a membership, optional payment and correct expiry date.
- [ ] Editing a member does not erase unrelated fields or historical transactions.
- [ ] Renewals and partial payments do not exceed membership total.
- [ ] Duplicate attendance check-ins and duplicate locker assignments are prevented.
- [ ] Expense edit/delete audits are visible and exported totals reconcile.
- [ ] Cloudinary upload works for PNG/JPEG/WebP and rejects invalid files.
- [ ] CSV dry run, import, duplicate detection and export work with actual gym data.
- [ ] Dark/light theme, tablet/mobile layout, tables, grid views, forms, and animations work.
- [ ] Rate limiting, HTTPS, backups and security monitoring are configured for the deployment.

## Scope boundaries / recommended future expansions

- **Biometric fingerprint device:** not connected in this version. Local TCP/IP device protocols (such as port 4370) require a local network bridge/agent to relay attendance to hosted services; do not expose the device port publicly.
- **SMS, WhatsApp, billing gateway, receipts to customer, payroll disbursement:** not integrated (no provider credentials or requirements supplied); expense and payment ledgers are manually recorded.
- **Historical member migration:** member CSV import is provided; historical ledger/biometric imports require a mapping from the source data and a staging validation pass.
- **Reporting scale:** first release limits some API list sizes for predictable response time. Add database-driven pagination/aggregate SQL and advanced exports for very large multi-branch gyms.
- **Local preview:** fake sample records are intentionally ephemeral. Real mode persists to Neon.

This code is a functional project foundation, not a certification that an untested production deployment will run without issues. Verify with your actual Neon and Cloudinary connections before using it for live financial or personally identifiable data.
#   f i t n e s s _ p o w e r  
 