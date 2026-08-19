import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { createContipayCheckout, generateWebhookToken } from "@/lib/contipay";

export async function POST(req) {
  const body = await req.json();
  const { productId, email, phone, firstName, lastName } = body;

  if (!productId || !email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email and productId are required." }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.published) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const reference = `SH-${crypto.randomBytes(8).toString("hex")}`;
  const webhookToken = generateWebhookToken();

  // Create the order as "pending" first so the webhook has something to find
  // when ContiPay calls back. Nothing is downloadable until status is "paid".
  const order = await prisma.order.create({
    data: {
      productId: product.id,
      email: email.toLowerCase(),
      phone: phone || null,
      contipayReference: reference,
      status: "pending",
      webhookToken,
    },
  });

  try {
    const { redirectUrl } = await createContipayCheckout({
      amount: product.priceCents / 100,
      currency: product.currency,
      email,
      phone,
      firstName,
      lastName,
      reference,
      webhookToken,
    });

    return NextResponse.json({ redirectUrl, reference });
  } catch (err) {
    console.error("ContiPay checkout creation failed:", err);
    // Clean up the pending order since payment was never actually started.
    await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
    return NextResponse.json(
      { error: "Could not start checkout with ContiPay. Please try again." },
      { status: 502 }
    );
  }
}
