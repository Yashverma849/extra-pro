import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { addActivity, createUser, publicUser, readStore, writeStore, type Role } from "@/lib/server-store";

export const runtime = "nodejs";

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ users: readStore().users.map(publicUser) });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json();
    const user = createUser({ username: String(body.username), fullName: String(body.fullName), password: String(body.password), role: body.role as Role });
    const store = readStore();
    addActivity(store, admin.fullName, "USER_CREATED", `${user.fullName} · ${user.role}`);
    writeStore(store);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create user" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const store = readStore();
  const user = store.users.find(item => item.id === body.id);
  if (!user || user.id === admin.id) return NextResponse.json({ error: "User cannot be changed" }, { status: 400 });
  user.active = Boolean(body.active);
  addActivity(store, admin.fullName, user.active ? "USER_ENABLED" : "USER_DISABLED", user.fullName);
  writeStore(store);
  return NextResponse.json({ user: publicUser(user) });
}

