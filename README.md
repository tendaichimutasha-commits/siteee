# Still Hyper — drum kit & beat store

A store for selling drum kits and beats: browse, buy with a card via Paddle,
and get a download link for the files (rar, zip, wav, mp3, individual stems —
any file type). You upload everything yourself from a password-protected
`/admin` panel; the price you set there is what gets charged, automatically.

## How it works

- **Storefront** (`/`) — public product grid + product pages with a preview
  player and a "Buy now" button.
- **Checkout** — Paddle's hosted checkout overlay. Paddle handles card
  processing, tax/VAT, and fraud checks, then pays out to your bank or PayPal
  (Zimbabwe isn't on Stripe's list, but Paddle supports payouts there).
- **Admin** (`/admin`) — log in with one shared password, upload a kit/beat.
  The moment you save it, the app automatically creates a matching product +
  price in Paddle via their API, so checkout always charges exactly what you
  typed — no manual dashboard work.
- **Files** live in an S3-compatible bucket (Cloudflare R2 recommended — 10GB
  free, no egress fees, ideal for wav/rar files). Cover art and previews are
  public; full packages are only ever accessed through short-lived signed
  links generated after payment is confirmed.
- **Payment confirmation** happens via a Paddle webhook, which is the only
  thing that ever marks an order "paid" and unlocks the download — nothing
  client-side can fake it.

## 1. Set up the three outside accounts

You need three free accounts before this runs:

1. **Paddle** — [paddle.com](https://paddle.com), sign up, stay in **Sandbox**
   mode first to test with fake cards. Go live later from the same dashboard.
   - Developer Tools → Authentication → create an **API key** → `PADDLE_API_KEY`
   - Developer Tools → Authentication → **Client-side token** → `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
   - Developer Tools → Notifications → add a webhook destination pointing to
     `https://<your-railway-domain>/api/webhooks/paddle`, subscribe to the
     `transaction.completed` event, copy the **secret key** → `PADDLE_WEBHOOK_SECRET`
   - Under **Payouts**, connect your bank account or PayPal — this is where
     your money actually lands (Paddle can't pay a card number directly,
     only accounts).

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
   Go back and update the Paddle webhook URL from step 1 with this domain.
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

Hit **Publish** — it's now live on the storefront and buyable immediately.

## 5. Go live for real money

While `PADDLE_ENV` / `NEXT_PUBLIC_PADDLE_ENV` are `sandbox`, all checkouts use
fake test cards (Paddle's docs list test card numbers). When you're ready:

1. In Paddle, complete their business verification to activate **Live mode**.
2. Generate live versions of the API key, client-side token, and webhook
   secret from live mode (they're separate from sandbox ones).
3. Update those three Railway variables, plus set both env vars to
   `"production"`.

## Local development

```bash
npm install
cp .env.example .env   # fill in real values, or point DATABASE_URL at a local Postgres
npx prisma migrate deploy
npm run dev
```

## Notes & limits worth knowing

- Very large uploads (multi-GB stem packs) will be slow over a home upload
  connection since the admin panel streams them straight through to R2 — for
  huge packs, consider zipping stems into one rar rather than uploading
  hundreds of individual files.
- Download links expire 7 days after purchase (see `downloadExpiresAt` in
  `webhooks/paddle/route.js`) — change the `7 * 24 * 60 * 60 * 1000` value if
  you want longer.
- The admin area is a single shared password, not individual accounts — fine
  for a one-person store; say the word if you ever want proper multi-user
  logins.
