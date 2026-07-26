import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { currentUser, requireAdmin } from "@/lib/auth";
import { addActivity, readStore, writeStore, type WatchlistClassification, type WatchlistSource } from "@/lib/server-store";
import { canCreateSourceClassification, canDisableWatchlistSource } from "@/lib/watchlist-source-policy";

export const runtime = "nodejs";

export async function GET() {
  if (!await currentUser()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = readStore();
  return NextResponse.json({ sources: store.watchlistSources });
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin access is required" }, { status: 403 });
  const body = await request.json();
  const name = String(body.name || "").trim();
  const code = String(body.code || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const authority = String(body.authority || "").trim();
  const classification = String(body.classification || "") as WatchlistClassification;
  const treatment = String(body.treatment || "").trim();
  const legalBasis = String(body.legalBasis || "").trim();
  if (!name || !code || !authority || !treatment || !legalBasis) return NextResponse.json({ error: "Name, code, authority, treatment and legal/policy basis are required" }, { status: 400 });
  if (!canCreateSourceClassification(classification)) return NextResponse.json({ error: "New sources may be Additional External, PEP or Internal. UN and Oman are the only locked mandatory Oman TFS sources." }, { status: 400 });
  const store = readStore();
  if (store.watchlistSources.some(source => source.name.toLowerCase() === name.toLowerCase() || source.code === code)) return NextResponse.json({ error: "A watchlist source with this name or code already exists" }, { status: 409 });
  const source: WatchlistSource = {
    id: randomUUID(), code, name, authority, classification, treatment, legalBasis,
    format: "STANDARD_CSV", active: true, systemDefined: false, statutoryLocked: false,
    createdAt: new Date().toISOString(), createdBy: user.fullName,
  };
  store.watchlistSources.push(source);
  addActivity(store, user.fullName, "WATCHLIST_SOURCE_CREATED", `${source.name} · ${source.classification} · ${source.authority}`);
  writeStore(store);
  return NextResponse.json({ source }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin access is required" }, { status: 403 });
  const body = await request.json();
  const store = readStore();
  const source = store.watchlistSources.find(item => item.id === String(body.id || ""));
  if (!source) return NextResponse.json({ error: "Watchlist source not found" }, { status: 404 });
  if (!canDisableWatchlistSource(source) && body.active === false) return NextResponse.json({ error: "UN and Oman mandatory statutory sources cannot be disabled" }, { status: 400 });
  if (typeof body.active === "boolean") source.active = body.active;
  if (!source.statutoryLocked) {
    if (body.treatment) source.treatment = String(body.treatment).trim();
    if (body.legalBasis) source.legalBasis = String(body.legalBasis).trim();
  }
  addActivity(store, user.fullName, "WATCHLIST_SOURCE_UPDATED", `${source.name} · ${source.active ? "Active" : "Inactive"}`);
  writeStore(store);
  return NextResponse.json({ source });
}
