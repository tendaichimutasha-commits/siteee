import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

// ContiPay's own webhook-signing scheme isn't in their public docs, so this
// endpoint doesn't try to verify one. Instead: when we start a checkout, we
// generate a random token and put it in the webhook URL itself
// (?token=...). That token is stored against the order and never shown to
// the customer, so a request without the right token can't be a genuine
// callback for that order — this is what we check below instead of a
// signature header.
export async function POST(req, { params }) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 401 });
  }

  const order = await prisma.order.findUnique({ where: { webhookToken: token } });
  if (!order) {
    return NextResponse.json({ error: "unknown order" }, { status: 404 });
  }

  const rawBody = await req.text();
  let event = {};
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    // Some gateways send form-encoded callbacks instead of JSON.
    event = Object.fromEntries(new URLSearchParams(rawBody));
  }

  // ContiPay's exact payload field names aren't public, so we check the
  // common ones a "status" field could show up under.
  const status = String(
    event.status || event.transactionStatus || event.paymentStatus || event.state || ""
  ).toLowerCase();

  const isPaid = ["success", "successful", "paid", "completed", "complete"].includes(status);
  const isFailed = ["failed", "cancelled", "canceled", "declined", "error"].includes(status);

  // Already processed — respond OK so ContiPay stops retrying, but don't
  // double-apply anything.
  if (order.status === "paid") {
    return NextResponse.json({ ok: true });
  }

  if (isPaid) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "paid",
        downloadToken: crypto.randomBytes(24).toString("hex"),
        downloadExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  } else if (isFailed) {
    await prisma.order.update({ where: { id: order.id }, data: { status: "failed" } });
  } else {
    // Unrecognized status — log it so you can see the real field ContiPay
    // uses and adjust the checks above.
    console.warn("ContiPay webhook: unrecognized payload, order left pending:", event);
  }

  return NextResponse.json({ ok: true });
}
