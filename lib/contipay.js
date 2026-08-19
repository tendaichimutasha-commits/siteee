import crypto from "crypto";

// ContiPay's official JS client. Docs: https://github.com/njzw/contipay-js-client
const Contipay = require("contipay-js/src/contipay");
const RedirectMethod = require("contipay-js/src/helpers/redirect_method");

const APP_MODE = process.env.CONTIPAY_MODE === "LIVE" ? "LIVE" : "DEV";

function client() {
  return new Contipay(process.env.CONTIPAY_TOKEN, process.env.CONTIPAY_SECRET);
}

// We can't verify ContiPay's webhook signing scheme from public docs, so we
// don't rely on one. Instead we mint our own random token per order and
// embed it in the webhook URL we hand to ContiPay. Only a request that comes
// back with that exact token could possibly be the real callback for that
// order — nobody can fake a "paid" webhook without first seeing this token,
// which never appears anywhere public.
export function generateWebhookToken() {
  return crypto.randomBytes(24).toString("hex");
}

// Starts a hosted-checkout ("redirect") payment. The customer is sent to a
// ContiPay-hosted page to pay by card or mobile money, then bounced back to
// successUrl/cancelUrl. Real confirmation comes from the webhook, not the
// redirect — the success page just polls for that.
export async function createContipayCheckout({
  amount,
  currency,
  email,
  phone,
  firstName,
  lastName,
  reference,
  webhookToken,
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not set — needed to build ContiPay redirect URLs.");
  }

  const merchantCode = process.env.CONTIPAY_MERCHANT_CODE;
  if (!merchantCode) {
    throw new Error("CONTIPAY_MERCHANT_CODE is not set.");
  }

  const webhookUrl = `${siteUrl}/api/webhooks/contipay?token=${webhookToken}`;
  const successUrl = `${siteUrl}/success?ref=${reference}`;
  const cancelUrl = `${siteUrl}/product?cancelled=1`;

  const payload = new RedirectMethod(merchantCode, webhookUrl, successUrl, cancelUrl)
    .setUpCustomer(firstName || "Customer", lastName || "Store", phone || "", "ZW", email)
    .setUpTransaction(amount, currency || "USD")
    .preparePayload();

  // Attach our own reference so we can match the webhook back to this order.
  // (Field name is a best guess at what ContiPay's payload accepts — if their
  // API rejects an unrecognized field, remove this line; we still have the
  // webhook token as the source of truth for matching.)
  payload.reference = reference;

  const contipay = client();
  const res = await contipay.setAppMode(APP_MODE).setPaymentMethod("redirect").process(payload);

  const data = typeof res === "string" ? JSON.parse(res) : res;

  // ContiPay's exact response shape isn't documented publicly. We check the
  // common field names a hosted-checkout redirect URL would come back under.
  const redirectUrl =
    data?.redirectUrl || data?.redirect_url || data?.url || data?.paymentUrl || data?.data?.redirectUrl;

  if (!redirectUrl) {
    throw new Error(
      `ContiPay did not return a redirect URL. Raw response: ${JSON.stringify(data)}`
    );
  }

  return { redirectUrl, raw: data };
}
