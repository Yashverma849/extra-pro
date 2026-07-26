import { NextResponse } from "next/server";
import { readStore } from "@/lib/server-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const store = readStore();
    return NextResponse.json({ status: "ok", time: new Date().toISOString(), activeUsers: store.users.filter(user => user.active).length });
  } catch {
    return NextResponse.json({ status: "unhealthy" }, { status: 503 });
  }
}
