# ServiceNest

ServiceNest is a local services booking marketplace. Customers compare verified providers, book a time slot, and track the visit. Providers manage jobs and see earnings calculated by the server. Administrators verify providers, resolve disputes, and review platform revenue.

This repository is a pilot-ready codebase with secure defaults. It is not a legal, payments, or security certification. Put it behind HTTPS, review the deployment, and connect real credentials before taking live payments.

## Stack

- React, Vite, Material UI, React Router, Axios, Recharts
- Node.js, Express, MongoDB, Mongoose
- JWT in an HTTP-only cookie, bcrypt password hashing via `bcryptjs`
- OpenStreetMap tiles and Nominatim geocoding, unless a Google geocoding key is set
- Cash after service by default
- Razorpay test mode when keys are present
- A clearly labelled development payment simulator when they are not

Money is stored as integer paise. The interface shows rupees.

## Quick start

1. Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) or start the included Docker database:

```bash
docker compose up -d
```

2. Install dependencies from the repository root:

```bash
npm run install:all
```

3. Create the server environment file:

```bash
cp server/.env.example server/.env
```

On Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env
```

4. Replace `JWT_SECRET` with a random string of at least 32 characters. A placeholder value will stop the server from starting.

5. Seed demo categories, plans, and clearly labelled demo profiles:

```bash
npm run seed
```

The default demo password is `DemoPass123!` unless you set `SEED_DEMO_PASSWORD`. Demo emails use `@demo.servicenest.local`. The seed command refuses to run when `NODE_ENV=production` unless `ALLOW_SEED=true`.

6. Create the first administrator. Public registration cannot create an admin.

```bash
# Set these in server/.env or in the shell before the command.
# ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD (10+ characters, with a letter and a number)
npm run create-admin
```

7. Start the API and the web app:

```bash
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:5000/api/health

The Vite dev server proxies `/api` and `/uploads` to the API, so the login cookie stays on one origin.

## Demo accounts

After seeding:

Every `@demo.servicenest.local` account uses the demo password. Useful starting points:

| Role | Email |
| --- | --- |
| Customer with bookings, reviews, and a dispute | `customer@demo.servicenest.local` |
| Electrician with earnings | `electrician@demo.servicenest.local` |
| Plumber | `plumber@demo.servicenest.local` |
| AC technician | `ac@demo.servicenest.local` |
| Cleaner | `cleaning@demo.servicenest.local` |
| Painter awaiting verification | `painter@demo.servicenest.local` |

The seed also creates extra dummy customers (`meera@`, `rohan@`, `anita@`) and dummy providers for every category. Painter and carpenter profiles stay in the approval queue with a sample document. Approved profiles are marked Demo. None of these records are real people or businesses.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | API with reload and Vite |
| `npm test` | Server tests, then client validation tests |
| `npm run build` | Production client bundle |
| `npm start` | API only. Serves `client/dist` when that folder exists |
| `npm run seed` | Demo data |
| `npm run create-admin` | First administrator |

Server-only equivalents live in `server/package.json` (`npm test`, `npm run seed`, `npm run create-admin`).

## Revenue model

1. **Booking commission.** Default 10% (`1000` basis points) of the service amount, configurable by an administrator. On an ₹800 service the commission is ₹80 and the provider share is ₹720. Tax, when configured, is added to what the customer pays. The commission is not added a second time. Gateway charges are stored as a separate line and are ₹0 until a settlement feed exists.
2. **Provider plans.** Free, Basic, and Premium control active listing limits and whether a provider can buy promotion or see an earnings chart. A paid plan lasts 30 days per payment. Recurring autopay is not enabled.
3. **Promoted listings.** Paid placement is labelled **Promoted**. It is separate from the **Verified** badge.

Commissions are created only for a completed booking whose payment is collected. Refunding a payment reverses that commission. Providers cannot edit earnings or payouts. An administrator generates a payout from unassigned commission rows and marks it paid.

## Payments

- **Cash after service** creates the booking immediately. The provider records collection, and the server writes the ledger.
- **Razorpay** is used only when `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set. The browser success handler is not trusted: the API checks the signature and fetches the payment from Razorpay to confirm the amount. Webhooks need `RAZORPAY_WEBHOOK_SECRET` and should target `POST /api/payments/webhook`.
- **Development simulator** appears only when Razorpay is not configured and `NODE_ENV` is not `production`. The button states that no real charge is made. The server sets the amount from the booking, not from the browser. The endpoint returns 403 in production.

Online bookings that stay unpaid for 30 minutes are cancelled so the slot can be booked again.

## Notifications and WhatsApp

In-app notifications are created for new bookings, acceptance, rejection, reminders, job progress, completion, cancellation, payment updates, and verification decisions. Email is sent only when `SMTP_HOST` is set. Otherwise the notification record says the email was skipped.

WhatsApp is a click-to-chat link with a prefilled message. It is shown to the customer after the provider accepts. The app does not send WhatsApp messages by itself. A WhatsApp Business API sender is not included.

Booking reminders for the next calendar day run hourly inside the API process when `ENABLE_REMINDER_JOB` is not `false`. A production deployment should move that to a real scheduler.

## Location

Providers set a city, a radius, and coordinates. Search uses a `2dsphere` index when the customer supplies coordinates, and a city match otherwise. If the browser denies location, the customer can type a city. Nominatim is rate-limited. A `GOOGLE_MAPS_API_KEY` switches geocoding to Google. Map tiles stay on OpenStreetMap.

Street addresses and phone numbers on a booking are shown to the customer, to an administrator, and to the provider only after the booking is accepted.

## Tests

```bash
npm test
```

Server tests cover commission math, slot conflicts, Razorpay signature checks, registration, role checks, booking conflicts, status changes, one-time commission creation, the development payment simulator, and refunds. Client tests cover registration, booking validation, rupee formatting, and WhatsApp link encoding.

The integration suite downloads a MongoDB binary on first run through `mongodb-memory-server`.

## Production notes

- Set `NODE_ENV=production`, a unique `JWT_SECRET`, and `CLIENT_ORIGIN` to the real site origin.
- Set `TRUST_PROXY=true` only behind a reverse proxy you control.
- Serve the site with HTTPS so the auth cookie `Secure` flag is meaningful.
- Do not enable `ALLOW_SEED` on a database that contains real customers.
- Verification files live in `server/uploads/private` and are not served as public static files.
- Logs record method, path, and status. They do not record passwords, tokens, or message bodies.

API details are in [docs/API.md](docs/API.md).
