import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { uploadBuffer } from "@/lib/storage";
import crypto from "crypto";

export const runtime = "nodejs";

// Accepts any file type - covers cover art (jpg/png), preview audio (mp3),
// and downloadable package files (wav, rar, zip, individual stems, etc).
export async function POST(req) {
  if (!requireAdmin()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file) {
    return NextResponse.json({ error: "no file provided" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const key = `uploads/${crypto.randomBytes(12).toString("hex")}.${ext}`;

  try {
    await uploadBuffer(key, buffer, file.type || "application/octet-stream");
  } catch (err) {
    console.error("R2/S3 upload error:", err);
    return NextResponse.json(
      { error: `Storage error: ${err.message || "check S3/R2 env vars are set correctly"}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    key,
    filename: file.name,
    sizeBytes: buffer.length,
  });
}
