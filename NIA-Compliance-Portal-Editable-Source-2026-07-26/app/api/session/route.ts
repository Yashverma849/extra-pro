import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, currentUser } from "@/lib/auth";
import { addActivity, publicUser, readStore, verifyPassword, writeStore } from "@/lib/server-store";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  return user ? NextResponse.json({ user }) : NextResponse.json({ user: null }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  const wantsHtml = !contentType.includes("application/json");
  let username = "";
  let password = "";
  if (contentType.includes("application/json")) {
    const body = await request.json();
    username = String(body.username || "");
    password = String(body.password || "");
  } else {
    const body = await request.formData();
    username = String(body.get("username") || "");
    password = String(body.get("password") || "");
  }
  const store = readStore();
  const user = store.users.find(item => item.username.toLowerCase() === username.trim().toLowerCase());
  const locked = user?.lockedUntil && new Date(user.lockedUntil) > new Date();
  if (!user || !user.active || locked || !verifyPassword(password, user.passwordHash)) {
    if (user && !locked) {
      user.failedLoginCount = (user.failedLoginCount || 0) + 1;
      if (user.failedLoginCount >= 5) user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      addActivity(store, user.fullName, "LOGIN_FAILED", user.failedLoginCount >= 5 ? "Account temporarily locked after repeated failed sign-in attempts" : "Invalid sign-in attempt");
      writeStore(store);
    }
    if (wantsHtml) return NextResponse.redirect(new URL("/?login=invalid", request.url), 303);
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }
  user.failedLoginCount = 0;
  user.lockedUntil = null;
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  store.sessions = store.sessions.filter(item => new Date(item.expiresAt) > new Date());
  store.sessions.push({ token: tokenHash, userId: user.id, expiresAt });
  user.lastLogin = new Date().toISOString();
  addActivity(store, user.fullName, "LOGIN", "Signed in to the intranet portal");
  writeStore(store);
  const response = wantsHtml
    ? NextResponse.redirect(new URL("/", request.url), 303)
    : NextResponse.json({ user: publicUser(user) });
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NIA_COOKIE_SECURE === "1", sameSite: "strict", path: "/", maxAge: 8 * 60 * 60 });
  return response;
}

export async function DELETE() {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (raw) {
    const store = readStore();
    const hash = createHash("sha256").update(raw).digest("hex");
    store.sessions = store.sessions.filter(session => session.token !== hash && session.token !== raw);
    writeStore(store);
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NIA_COOKIE_SECURE === "1", sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
