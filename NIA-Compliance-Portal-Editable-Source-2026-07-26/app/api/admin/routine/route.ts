import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readStore } from "@/lib/server-store";

export const runtime = "nodejs";

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const store = readStore();
  return NextResponse.json({ routines: store.routines, activities: store.activities.slice(0, 20), counts: { users: store.users.filter(u => u.active).length, cases: store.cases.length, customers: store.customers.length } });
}

