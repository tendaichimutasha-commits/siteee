import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { deleteObject } from "@/lib/storage";

export async function PATCH(req, { params }) {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      ...(typeof body.published === "boolean" ? { published: body.published } : {}),
    },
  });
  return NextResponse.json({ product });
}

export async function DELETE(req, { params }) {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { files: true },
  });
  if (!product) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Best-effort cleanup of the stored files, then remove the DB record.
  for (const f of product.files) {
    try {
      await deleteObject(f.key);
    } catch (e) {
      // ignore individual file cleanup failures
    }
  }
  try {
    await deleteObject(product.coverImageKey);
    if (product.previewAudioKey) await deleteObject(product.previewAudioKey);
  } catch (e) {}

  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
