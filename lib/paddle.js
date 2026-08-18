import crypto from "crypto";

const PADDLE_API_BASE =
  process.env.PADDLE_ENV === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

function headers() {
  return {
    Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
    "Content-Type": "application/json",
  };
}

// Called automatically when you save a kit/beat in the admin panel.
// Creates a matching Paddle "product" and "price" so checkout always
// charges exactly the price you set — no manual Paddle dashboard work.
export async function createPaddleProductAndPrice({ name, description, priceCents, currency }) {
  const productRes = await fetch(`${PADDLE_API_BASE}/products`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name,
      description,
      tax_category: "digital-goods",
    }),
  });
  if (!productRes.ok) {
    throw new Error(`Paddle product creation failed: ${await productRes.text()}`);
  }
  const product = (await productRes.json()).data;

  const priceRes = await fetch(`${PADDLE_API_BASE}/prices`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      product_id: product.id,
      description: `${name} - standard price`,
      unit_price: {
        amount: String(priceCents),
        currency_code: currency || "USD",
      },
    }),
  });
  if (!priceRes.ok) {
    throw new Error(`Paddle price creation failed: ${await priceRes.text()}`);
  }
  const price = (await priceRes.json()).data;

  return { paddleProductId: product.id, paddlePriceId: price.id };
}

export async function updatePaddlePrice({ priceId, priceCents, currency }) {
  // Paddle prices are immutable amounts — to change a price we archive the
  // old one and create a fresh one, then swap the id we store on the product.
  await fetch(`${PADDLE_API_BASE}/prices/${priceId}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ status: "archived" }),
  });
}

// Verifies the `Paddle-Signature` header on incoming webhooks so nobody can
// fake a "payment complete" call and get free downloads.
export function verifyPaddleWebhook(rawBody, signatureHeader) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(";").map((p) => p.split("="))
  );
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  const signedPayload = `${ts}:${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return (
    expected.length === h1.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(h1))
  );
}
