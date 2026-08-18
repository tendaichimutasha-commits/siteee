import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { verifyPaddleWebhook } from "@/lib/paddle";

// Paddle needs the raw request body (unparsed) to verify the signature.
export async function POST(req) {
  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature");

  if (!verifyPaddleWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event_type === "transaction.completed") {
    const tx = event.data;
    const productId = tx.custom_data?.productId;
    const email = tx.customer?.email || tx.customer_email;

    if (!productId || !email) {
      return NextResponse.json({ error: "missing product/email in transaction" }, { status: 400 });
    }

    // Idempotent: if we've already processed this transaction, do nothing.
    const existing = await prisma.order.findUnique({
      where: { paddleTransactionId: tx.id },
    });
    if (existing) {
      return NextResponse.json({ ok: true });
    }

    await prisma.order.create({
      data: {
        productId,
        email: email.toLowerCase(),
        paddleTransactionId: tx.id,
        status: "paid",
        downloadToken: crypto.randomBytes(24).toString("hex"),
        downloadExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  }

  return NextResponse.json({ ok: true });
}
