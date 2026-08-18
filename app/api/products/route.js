import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { createPaddleProductAndPrice } from "@/lib/paddle";

export async function GET() {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const products = await prisma.product.findMany({
    include: { files: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ products });
}

export async function POST(req) {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, kind, priceCents, currency, coverImageKey, previewAudioKey, files } = body;

  if (!title || !priceCents || !coverImageKey || !files?.length) {
    return NextResponse.json(
      { error: "title, priceCents, coverImageKey and at least one file are required" },
      { status: 400 }
    );
  }

  const slug = `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;

  // Automatic pricing: once a payment provider is wired up, the price you set
  // here becomes the live checkout price instantly. Until then (Paddle isn't
  // usable and ContiPay isn't connected yet), we skip this step so you can
  // still catalog kits — checkout just isn't live until that's finished.
  let paddleProductId = null;
  let paddlePriceId = null;
  if (process.env.PADDLE_API_KEY) {
    try {
      const result = await createPaddleProductAndPrice({
        name: title,
        description: description || title,
        priceCents,
        currency: currency || "USD",
      });
      paddleProductId = result.paddleProductId;
      paddlePriceId = result.paddlePriceId;
    } catch (err) {
      console.error("Paddle price creation failed:", err);
      // Don't block cataloging the product over a payment-provider issue.
    }
  }

  let product;
  try {
    product = await prisma.product.create({
      data: {
        slug,
        title,
        description: description || "",
        kind: kind || "kit",
        priceCents,
        currency: currency || "USD",
        coverImageKey,
        previewAudioKey: previewAudioKey || null,
        paddleProductId,
        paddlePriceId,
        files: {
          create: files.map((f) => ({
            key: f.key,
            filename: f.filename,
            sizeBytes: f.sizeBytes,
          })),
        },
      },
    });
  } catch (err) {
    console.error("Product creation failed:", err);
    return NextResponse.json(
      { error: `Could not save product: ${err.message || "database error"}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ product });
}
