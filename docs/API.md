# ServiceNest API

Base path: `/api`

Success responses use `{ "success": true, "data": ... }`. List endpoints also return `pagination` with `page`, `limit`, `total`, and `pages`.

Errors use `{ "success": false, "message": "...", "errors": [{ "field": "...", "message": "..." }] }`.

Authentication is an HTTP-only cookie named `sn_token`. Send cookies on browser requests (`credentials: include`). Tests may also send `Authorization: Bearer <token>`.

Roles are `customer`, `provider`, and `admin`. Every protected route checks the role on the server.

Amounts are integers in paise.

## Public

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Process health |
| GET | `/config/public` | Platform name, payment mode, commission, map provider |
| GET | `/geo/search?q=` | Place suggestions. Empty when geocoding is unavailable |
| POST | `/auth/register` | Customer or provider only |
| POST | `/auth/login` | Sets the session cookie |
| POST | `/auth/logout` | Clears the cookie |
| GET | `/categories` | Active categories |
| GET | `/plans` | Active subscription plans |
| GET | `/providers/search` | Verified providers. Query: `category`, `city`, `lat`, `lng`, `radius`, `q`, `minRating`, `minPricePaise`, `maxPricePaise`, `available=true`, `sort`, `page` |
| GET | `/providers/featured` | Currently promoted verified providers |
| GET | `/providers/:id` | Public profile. No phone, email, documents, or customer addresses |
| GET | `/providers/:id/slots?date=YYYY-MM-DD` | Open and busy slots |
| GET | `/providers/:id/reviews` | Public reviews |
| GET | `/listings?providerId=` | Active listings |
| GET | `/reviews/recent` | Homepage reviews |

`sort` is `relevance`, `price_asc`, `price_desc`, or `rating`. Relevance puts labelled Promoted profiles first.

## Signed-in user

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/auth/me` | any | Current user |
| PATCH | `/auth/profile` | any | Name and phone |
| PATCH | `/auth/password` | any | Change password |
| GET | `/notifications` | any | In-app notifications |
| PATCH | `/notifications/:id/read` | any | Mark one read |
| POST | `/notifications/read-all` | any | Mark all read |

## Customer

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/customers/me` | Saved addresses |
| GET | `/customers/me/summary` | Upcoming and recent bookings |
| POST | `/customers/me/addresses` | Save an address |
| PATCH | `/customers/me/addresses/:addressId` | Update an address |
| DELETE | `/customers/me/addresses/:addressId` | Remove an address |
| POST | `/bookings/quote` | Server price quote. Body: `{ "listingId" }` |
| POST | `/bookings` | Create a booking |
| POST | `/bookings/:id/photos` | Up to 4 images while the booking is pending |
| POST | `/reviews` | One review for a completed booking |
| POST | `/disputes` | Open a dispute on a completed or cancelled booking |

Booking body:

```json
{
  "listingId": "...",
  "scheduledDate": "2026-10-20",
  "startTime": "10:00",
  "issueDescription": "At least ten characters.",
  "paymentMethod": "cod",
  "address": { "line1": "12 Example Road", "city": "Pune", "state": "Maharashtra", "pincode": "411001" }
}
```

`paymentMethod` is `cod`, `razorpay`, or `dev_simulator`. The price in the request is ignored. A second booking for the same provider, date, and start time returns 409 while the first is pending, accepted, in progress, or completed.

## Provider

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/providers/me` | Private profile, documents metadata, plan |
| PATCH | `/providers/me` | Business details, categories, radius, coordinates |
| GET | `/providers/me/summary` | Today, pipeline counts, earnings snapshot |
| GET | `/providers/me/earnings` | Ledger and payouts. No write route exists |
| GET/POST | `/providers/me/listings`, `/listings` | Service listings, limited by plan |
| PATCH | `/listings/:id` | Edit or deactivate a listing |
| GET/PUT | `/providers/me/availability` | Weekly hours |
| POST/DELETE | `/providers/me/availability/blocks` | Block or unblock a date |
| POST | `/providers/me/documents` | Private verification upload |
| GET | `/providers/documents/:docId` | Download by owner or admin |
| POST | `/providers/me/portfolio` | Public portfolio image |
| POST | `/providers/me/subscription/free` | Switch to the free plan |
| POST | `/reviews/:id/response` | One public reply |

## Bookings and payments

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/bookings` | Own bookings. Providers and customers are scoped. Query `status`, `when=today` |
| GET | `/bookings/:id` | Participant or admin. Street address is hidden from the provider until acceptance |
| POST | `/bookings/:id/transition` | `{ "toStatus", "note", "collectCash" }` |
| POST | `/bookings/:id/collect-cash` | Provider records a cash payment |
| GET | `/bookings/:id/photos/:photoId` | Participant or admin |
| POST | `/payments/razorpay/order` | Creates an order for a booking, plan, or promotion |
| POST | `/payments/verify` | Signature plus Razorpay payment fetch |
| POST | `/payments/dev-simulate` | Development only. Ignores any client amount |
| POST | `/payments/webhook` | Raw-body Razorpay webhook |

Allowed transitions:

- Customer: pending or accepted → cancelled
- Provider: pending → accepted or rejected; accepted → in progress or cancelled; in progress → completed or cancelled
- Admin: cancel a booking that has not finished

Online bookings must be paid before a provider can accept them. Cash bookings can be accepted while unpaid. Completing a cash job can set `collectCash: true`. Commission is inserted once, with a unique booking key.

## Administrator

All routes below require an admin session.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/overview` | Counts, revenue, 30-day series, queue |
| GET | `/admin/reports?from=&to=` | Gross value, commission, subscriptions, refunds |
| GET | `/admin/users` | Accounts |
| PATCH | `/admin/users/:id/status` | Activate or deactivate. Not yourself |
| GET | `/admin/providers` | Verification queue and profiles |
| PATCH | `/admin/providers/:id/verification` | `approved`, `rejected`, `suspended`, or `pending` |
| PATCH | `/admin/providers/:id/featured` | Manual promotion. Still labelled Promoted |
| GET | `/admin/bookings` | All bookings |
| GET/PATCH | `/admin/disputes` | Review disputes |
| GET/PATCH | `/admin/settings` | Name, commission, tax, cash toggle, promotion price |
| GET/POST/PATCH | `/admin/categories` | Category catalogue |
| GET/POST/PATCH | `/admin/plans` | Plan catalogue |
| POST | `/admin/subscriptions/assign` | Grant a plan without a charge |
| GET/POST | `/admin/payouts`, `/admin/payouts/generate` | Build a payout from unpaid accrued commissions |
| PATCH | `/admin/payouts/:id/paid` | Mark a payout paid |
| GET | `/admin/payments` | Payment records |
| POST | `/admin/payments/:id/refund` | Record a refund and reverse commission |

Reports treat platform revenue as accrued commission plus real subscription payments. Development-simulator subscription payments are excluded from subscription revenue. Refunded commissions are not included in gross booking value.
