# Deploying CIM India (staging and production)

## 1. Environment variables

Set these on the host. Never commit them. `.env.example` lists every name.

| Variable | Needed | Notes |
|---|---|---|
| `JWT_SECRET` | **Required** | 32+ random characters. The app refuses to sign anyone in without it. Different value per environment. |
| `APP_URL` | **Required** | Public `https://` address, no trailing slash. Used in reset emails and Google sign-in. |
| `DATABASE_URL` | **Required** | Supabase transaction pooler (port 6543, `?pgbouncer=true`). |
| `DIRECT_URL` | **Required** | Supabase session pooler (port 5432). Used by migrations. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | For payments | `rzp_test_` on staging, `rzp_live_` on production. |
| `RAZORPAY_WEBHOOK_SECRET` | For payments | Without it the webhook rejects every call and enrollment relies on the browser redirect alone. |
| `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL` | For uploads | Cloudflare R2. In production the local upload fallback is disabled. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_AVATAR_BUCKET` | For profile pictures | Without them avatars would be written to local disk, which a serverless host does not keep. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional | Add `<APP_URL>/api/auth/google/callback` as an authorized redirect URI. |
| `RESEND_API_KEY`, `MAIL_FROM` | For password reset email | Without them reset links are only printed to the server log. |

## 2. One-time setup

1. `npm ci`
2. `npm run db:migrate` applies the migrations, including row level security on every table.
3. `npm run db:verify-rls` must print `RLS on` for every table and `table grants left for anon/authenticated: 0`.
4. `npm run storage:setup` creates the public `avatars` bucket.
5. Create the first admin account directly in the database. Do **not** run `npm run db:seed`: it deletes everything and refuses to run unless `ALLOW_DESTRUCTIVE_SEED=yes`.

## 3. External settings to update for the new address

- **Razorpay dashboard:** webhook URL `<APP_URL>/api/payments/webhook/razorpay`, events `payment.captured`, `payment.failed`, `order.paid`, secret = `RAZORPAY_WEBHOOK_SECRET`.
- **Cloudflare R2 bucket:** add the site address to `AllowedOrigins` in the CORS policy (keep PUT, GET, HEAD).
- **Google Cloud (if used):** authorized redirect URI as above.

## 4. After the first deploy

- Sign in as the admin and open Payments: make one test payment with a Razorpay test card and confirm the method and timestamps appear.
- Upload a small video in a lesson and play it as a student.
- Rotate the Supabase database password and update both URLs.

## Known limits

- Login and registration rate limits are counted per server instance. For strict global limits, back `lib/rate-limit.ts` with Redis.
- Course videos are served from a public bucket URL, so anyone holding a link can watch. Protected playback needs signed URLs or a player service.
- No Content-Security-Policy header yet (Razorpay, YouTube and the media host need to be allow-listed first).
