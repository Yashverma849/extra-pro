import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { publicUser, readStore } from "./server-store";

export const SESSION_COOKIE = "nia_session";

export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const store = readStore();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = store.sessions.find(item => (item.token === tokenHash || item.token === token) && new Date(item.expiresAt) > new Date());
  if (!session) return null;
  const user = store.users.find(item => item.id === session.userId && item.active);
  return user ? publicUser(user) : null;
}

export async function requireAdmin() {
  const user = await currentUser();
  return user?.role === "ADMIN" ? user : null;
}
