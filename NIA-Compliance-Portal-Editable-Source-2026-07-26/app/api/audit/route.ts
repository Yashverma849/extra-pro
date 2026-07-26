import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { readStore } from "@/lib/server-store";

export const runtime = "nodejs";

export async function GET() {
  if (!await currentUser()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ activities: readStore().activities.slice(0, 500) });
}
