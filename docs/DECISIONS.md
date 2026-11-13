# CareSlot Decisions

- Supabase is only the managed PostgreSQL host. SQLAlchemy connects from FastAPI; the frontend never uses Supabase credentials, SDKs, Auth, generated APIs, or RLS.
- `Asia/Karachi` is the single clinic timezone. Weekly rules are local wall-clock `time` values; appointment and time-off instants use timezone-aware UTC timestamps. Slot responses and inputs use ISO 8601 instants.
- New patient bookings start as `pending`; doctors or admins can confirm them. Only `pending` and `confirmed` appointments reserve a time range.
- PostgreSQL enforces provider overlap with `btree_gist` plus a partial GiST exclusion constraint over `[starts_at, ends_at)`. Adjacent appointments may touch at an endpoint without conflicting. The API also checks current availability for a clear conflict response and translates database integrity conflicts to HTTP 409.
- A patient may cancel or reschedule only when the existing appointment is more than two hours away. Rescheduling cancels the existing reservation and books the replacement in one transaction.
- Admin-created doctor accounts receive a password supplied at creation; the system does not implement email delivery or password-reset workflows because messaging is outside scope. Admin deactivation is a soft disable to preserve appointment history.
- Refresh tokens are signed JWTs with unique `jti` claims; only their SHA-256 hashes and expiry/revocation state are stored. Access and refresh tokens are exposed to the browser only as HttpOnly cookies by the Next.js BFF.
- Development and automated tests use SQLite only for the test suite. Production migrations require PostgreSQL, and Docker Compose expects the configured external Supabase database instead of starting a local database.
- API list endpoints use bounded page/page-size parameters and support text/specialty or status filtering where relevant. The initial UI requests the first 100 appointments per workspace view.
- The sample seed password is intentionally public demo data for local setup. It must not be reused for a public deployment.