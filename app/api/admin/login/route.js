import { NextResponse } from "next/server";
import { checkAdminPassword, createSessionCookieValue, ADMIN_COOKIE_NAME } from "@/lib/auth";

export async function POST(req) {
  const { password } = await req.json();

  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, createSessionCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
