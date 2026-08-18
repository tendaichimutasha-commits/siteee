import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("product");
  const email = searchParams.get("email");

  if (!productId || !email) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: {
      productId,
      email: email.toLowerCase(),
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!order) {
    return NextResponse.json({ status: "not_found" });
  }

  return NextResponse.json({
    status: order.status,
    downloadToken: order.status === "paid" ? order.downloadToken : null,
  });
}
