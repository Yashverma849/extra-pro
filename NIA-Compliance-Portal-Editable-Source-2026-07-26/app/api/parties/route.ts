import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { addActivity, updateStore, type CustomerRecord } from "@/lib/server-store";

export const runtime = "nodejs";
const text = (value: unknown) => String(value ?? "").trim();

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user || !["ADMIN", "COMPLIANCE", "REVIEWER"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const name = text(body.name);
  const identifier = text(body.identifier);
  if (!name || !identifier) return NextResponse.json({ error: "Name and identifier are required" }, { status: 400 });
  try {
    const party = updateStore(store => {
      if (store.customers.some(item => text(item.identifier).toUpperCase() === identifier.toUpperCase())) throw new Error("A party with this identifier already exists");
      const record: CustomerRecord = {
        ...body, id: `P-${randomUUID().slice(0, 8).toUpperCase()}`, name, identifier,
        type: text(body.type) || "Individual", risk: text(body.risk) || "Pending assessment",
        kyc: text(body.kyc) || "Pending", createdAt: new Date().toISOString(), createdBy: user.fullName,
      };
      store.customers.unshift(record);
      addActivity(store, user.fullName, "PARTY_CREATED", `${record.id} · ${record.name} · ${record.identifier}`);
      return record;
    });
    return NextResponse.json({ party }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create party" }, { status: 409 });
  }
}

