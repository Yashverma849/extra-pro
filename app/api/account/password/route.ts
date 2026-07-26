import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { readStore, setPassword, verifyPassword } from "@/lib/server-store";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { currentPassword, newPassword } = await request.json();
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(String(newPassword))) return NextResponse.json({ error: "New password must be at least 12 characters and include upper-case, lower-case, number and special character" }, { status: 400 });
  const stored = readStore().users.find(item => item.id === user.id);
  if (!stored || !verifyPassword(String(currentPassword), stored.passwordHash)) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  setPassword(user.id, String(newPassword));
  return NextResponse.json({ ok: true });
}
