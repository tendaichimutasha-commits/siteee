import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signedDownloadUrl } from "@/lib/storage";

export async function GET(req, { params }) {
  const order = await prisma.order.findUnique({
    where: { downloadToken: params.token },
    include: { product: { include: { files: true } } },
  });

  if (!order || order.status !== "paid") {
    return NextResponse.json({ error: "Invalid or unpaid order." }, { status: 404 });
  }

  if (order.downloadExpiresAt < new Date()) {
    return NextResponse.json(
      { error: "This download link has expired. Contact support for a new one." },
      { status: 410 }
    );
  }

  const files = await Promise.all(
    order.product.files.map(async (f) => ({
      filename: f.filename,
      url: await signedDownloadUrl(f.key, f.filename),
    }))
  );

  return NextResponse.json({ product: order.product.title, files });
}
