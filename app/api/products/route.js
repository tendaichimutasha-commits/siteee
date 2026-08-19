import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

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

  // ContiPay doesn't need a product/price pre-registered like Paddle did —
  // the price you set here is simply what gets charged at checkout time.
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
