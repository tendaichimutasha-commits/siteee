# Still Hyper — drum kit & beat store

A store for selling drum kits and beats: browse, buy via ContiPay (card or
mobile money — EcoCash, OneMoney, InnBucks, etc.), and get a download link
for the files (rar, zip, wav, mp3, individual stems — any file type). You
upload everything yourself from a password-protected `/admin` panel; the
price you set there is what gets charged, automatically.

## How it works

- **Storefront** (`/`) — public product grid + product pages with a preview
  player and a "Buy now" button.
- **Checkout** — the customer enters email + phone, then gets redirected to
  a ContiPay-hosted payment page (card or mobile money), then bounced back
  to a success page that polls until payment is confirmed.
- **Admin** (`/admin`) — log in with one shared password, upload a kit/beat.
  ContiPay doesn't need a product pre-registered like some gateways do — the
  price you type is simply what gets charged at checkout time.
- **Files** live in an S3-compatible bucket (Cloudflare R2 recommended — 10GB
  free, no egress fees, ideal for wav/rar files). Cover art and previews are
  public; full packages are only ever accessed through short-lived signed
  links generated after payment is confirmed.
- **Payment confirmation** happens via a webhook ContiPay calls after
  payment. Since ContiPay's exact webhook-signing scheme isn't in their
  public docs, this app protects that endpoint a different way: each order
  gets its own random token embedded in the webhook URL, so a request
  without the right token can't be mistaken for a real payment confirmation.

## ⚠️ Before you take real money

I built this against ContiPay's published SDK docs and README examples —
but I could not find their official webhook payload format, and found three
different community SDKs with slightly different method signatures, which
suggests the docs I could access publicly may be incomplete or dated. **Test
thoroughly in `CONTIPAY_MODE=DEV` (their sandbox) before going live**:

1. Buy a test product end-to-end and confirm you land on the success page
   with a working download link.
2. Check your server logs after a test payment — if you see
   `"ContiPay webhook: unrecognized payload, order left pending"`, ContiPay
   is sending a status field under a different name than this app expects.
   Paste that logged payload back and the check in
   `app/api/webhooks/contipay/route.js` can be corrected to match.
3. If checkout creation itself fails with "ContiPay did not return a
   redirect URL," check the logged raw response — the field name for the
   redirect link may need adjusting in `lib/contipay.js`.
4. Contact ContiPay support (support@contipay.co.zw) and ask them to confirm
   the redirect-checkout response format and whether they support custom
   webhook query parameters (needed for the token-based verification above)
   — if they don't allow query params on the webhook URL, that check will
   need to move to a header or POST body field instead.

## 1. Set up the outside accounts

1. **ContiPay** — [contipay.co.zw](https://contipay.co.zw), register and log
   in at [docs.contipay.co.zw](https://docs.contipay.co.zw). From there:
   - Get your **token** and **secret** → `CONTIPAY_TOKEN` / `CONTIPAY_SECRET`
   - Get your **merchant code** → `CONTIPAY_MERCHANT_CODE`
   - Stay in `CONTIPAY_MODE="DEV"` (their sandbox) until you've fully tested.

2. **Cloudflare R2** — [dash.cloudflare.com](https://dash.cloudflare.com) → R2
   → create a bucket → make it public (Settings → Public Access) to get your
   `S3_PUBLIC_URL`. Under "Manage API tokens" create an access key →
   `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`. Your endpoint is
   `https://<account_id>.r2.cloudflarestorage.com`.

3. **Railway** — [railway.app](https://railway.app), sign in with GitHub.

## 2. Push this project to GitHub

```bash
cd still-hyper-store
git init
git add .
git commit -m "Initial commit"
gh repo create still-hyper-store --private --source=. --push
# (or create the repo manually on github.com and follow its "push an
# existing repo" instructions)
```

## 3. Deploy on Railway

1. Railway dashboard → **New Project** → **Deploy from GitHub repo** → pick
   this repo.
2. Click **+ New** → **Database** → **PostgreSQL** in the same project.
   Railway wires `DATABASE_URL` into your app automatically.
3. Click your app service → **Variables** → paste in everything from
   `.env.example` (with your real values). Leave `DATABASE_URL` alone, Railway
   already set it.
4. **Settings** → **Networking** → **Generate Domain** to get your public URL.
   Set `NEXT_PUBLIC_SITE_URL` to that domain (e.g.
   `https://still-hyper-store-production.up.railway.app`) — the app builds
   the ContiPay success/cancel/webhook URLs from this automatically, so
   there's nothing to register on ContiPay's side manually.
5. Railway will run `npm install`, then `npm run build` (which also runs your
   database migration), then `npm start`. First deploy takes a few minutes.

Every time you `git push`, Railway redeploys automatically.

## 4. Log in and upload your first kit

Go to `https://<your-domain>/admin`, enter the `ADMIN_PASSWORD` you set, and
upload:
- a cover image
- an optional mp3 preview
- one or more downloadable files (rar, zip, wav, stems, mp3 — any mix)
- a title, description, and price

Hit **Publish** — it's now live on the storefront and buyable immediately
(against ContiPay's sandbox until you flip `CONTIPAY_MODE` to `LIVE`).

## 5. Go live for real money

1. Complete whatever business verification ContiPay requires to activate live
   transactions.
2. Get your live token/secret/merchant code from ContiPay (these are
   typically separate from sandbox credentials — confirm with their support).
3. Update `CONTIPAY_TOKEN`, `CONTIPAY_SECRET`, `CONTIPAY_MERCHANT_CODE` in
   Railway, and set `CONTIPAY_MODE="LIVE"`.
4. Do one real, small test purchase yourself before announcing the store.

## Local development

```bash
npm install
cp .env.example .env   # fill in real values, or point DATABASE_URL at a local Postgres
npx prisma migrate dev --name contipay   # generates the migration for the new schema
npm run dev
```

## Notes & limits worth knowing

- Very large uploads (multi-GB stem packs) will be slow over a home upload
  connection since the admin panel streams them straight through to R2 — for
  huge packs, consider zipping stems into one rar rather than uploading
  hundreds of individual files.
- Download links expire 7 days after purchase (see `downloadExpiresAt` in
  `app/api/webhooks/contipay/route.js`) — change the
  `7 * 24 * 60 * 60 * 1000` value if you want longer.
- The admin area is a single shared password, not individual accounts — fine
  for a one-person store; say the word if you ever want proper multi-user
  logins.
