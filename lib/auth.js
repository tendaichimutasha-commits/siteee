import crypto from "crypto";

const COOKIE_NAME = "admin_session";
const SESSION_HOURS = 12;

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("ADMIN_SESSION_SECRET is not set");
  return s;
}

export function createSessionCookieValue() {
  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = `${expires}`;
  const signature = crypto
    .createHmac("sha256", secret())
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

export function isValidSession(cookieValue) {
  if (!cookieValue) return false;
  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret())
    .update(payload)
    .digest("hex");
  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return false;
  return Number(payload) > Date.now();
}

export function checkAdminPassword(password) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false;
  const a = Buffer.from(password || "");
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
