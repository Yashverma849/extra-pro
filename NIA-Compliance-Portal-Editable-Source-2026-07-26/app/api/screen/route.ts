import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { currentUser } from "@/lib/auth";
import { addActivity, readStore, writeStore } from "@/lib/server-store";
import { screenEntries } from "@/lib/watchlists";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user || !["ADMIN", "COMPLIANCE", "REVIEWER"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const store = readStore();
  const activeIds = new Set(store.watchlistVersions.filter(version => version.active).map(version => version.id));
  const matches = screenEntries(store.watchlistEntries.filter(entry => activeIds.has(entry.versionId)), { name, identifier: String(body.identifier || ""), scope: String(body.scope || "All active lists") });
  if (matches.length) store.cases.unshift({
    id: `AML-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
    entity: name, detail: `${matches.length} potential watchlist match(es) from manual screening; top score ${matches[0].score}%`,
    type: matches[0].entry.category.toUpperCase().includes("PEP") ? "PEP" : "Screening",
    priority: matches[0].score >= 90 ? "Critical" : "High", owner: user.fullName, status: "New", age: "Now",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), history: [],
  });
  addActivity(store, user.fullName, "PARTY_SCREENED", `${name} · ${matches.length} potential match(es)`);
  writeStore(store);
  return NextResponse.json({
    screenedAt: new Date().toISOString(),
    activeVersions: store.watchlistVersions.filter(version => version.active).map(version => ({ category: version.category, version: version.version, records: version.recordCount })),
    matches: matches.map(match => ({ score: match.score, idMatch: match.idMatch, name: match.entry.primaryName, aliases: match.entry.aliases, category: match.entry.category, referenceNumber: match.entry.referenceNumber, partyType: match.entry.partyType, identifiers: match.entry.identifiers, remarks: match.entry.remarks })),
  });
}
