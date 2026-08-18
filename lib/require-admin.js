import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, isValidSession } from "@/lib/auth";

export function requireAdmin() {
  const cookieStore = cookies();
  const value = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return isValidSession(value);
}
