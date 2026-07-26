import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { normalizePepDeclaration } from "@/lib/pep-intake";
import { addActivity, readStore, writeStore, type UboRecord } from "@/lib/server-store";
import { aggregateUboRoutes, calculateEffectiveOwnership, hasCircularOwnershipPath, qualifiesAsUbo } from "@/lib/ubo-calculation";
import { screenEntries } from "@/lib/watchlists";

export const runtime = "nodejs";
const text = (value: unknown) => String(value ?? "").trim();

export async function GET() {
  if (!await currentUser()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = readStore();
  return NextResponse.json({ records: store.uboRecords, aggregates: aggregateUboRoutes(store.uboRecords) });
}

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user || !["ADMIN", "COMPLIANCE", "REVIEWER"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const companyName = text(body.companyName);
  const companyCr = text(body.companyCr);
  const naturalPersonName = text(body.naturalPersonName);
  const naturalPersonIdentifier = text(body.naturalPersonIdentifier);
  if (!companyName || !companyCr || !naturalPersonName) return NextResponse.json({ error: "Company name, CR number and natural-person name are required" }, { status: 400 });
  const companyRoutePercent = Number(body.companyRoutePercent);
  const naturalPersonPercent = Number(body.naturalPersonPercent);
  if (![companyRoutePercent, naturalPersonPercent].every(value => Number.isFinite(value) && value >= 0 && value <= 100)) {
    return NextResponse.json({ error: "Ownership percentages must be between 0 and 100" }, { status: 400 });
  }
  const store = readStore();
  const duplicate = store.uboRecords.some(record =>
    record.companyCr.toUpperCase() === companyCr.toUpperCase() &&
    (naturalPersonIdentifier
      ? record.naturalPersonIdentifier.toUpperCase() === naturalPersonIdentifier.toUpperCase()
      : record.naturalPersonName.toUpperCase() === naturalPersonName.toUpperCase()) &&
    record.ownershipPath.toUpperCase() === text(body.ownershipPath).toUpperCase()
  );
  if (duplicate) return NextResponse.json({ error: "This company, natural person and ownership path already exists" }, { status: 409 });
  const pepDeclared = normalizePepDeclaration(body.pepDeclared);
  if (pepDeclared === null) return NextResponse.json({ error: "PEP declaration must be YES, NO or UNKNOWN" }, { status: 400 });
  const effectiveOwnership = calculateEffectiveOwnership(companyRoutePercent, naturalPersonPercent);
  const ownershipPath = text(body.ownershipPath) || "Direct ownership";
  if (hasCircularOwnershipPath(ownershipPath)) return NextResponse.json({ error: "Circular ownership path detected; each entity may appear only once in a route" }, { status: 400 });
  const existingOwnership = store.uboRecords.filter(item => item.companyCr.toUpperCase() === companyCr.toUpperCase() && item.controlBasis.toUpperCase() === "OWNERSHIP ONLY").reduce((sum, item) => sum + item.effectiveOwnership, 0);
  if (text(body.controlBasis).toUpperCase() === "OWNERSHIP ONLY" && existingOwnership + effectiveOwnership > 100.0001) {
    return NextResponse.json({ error: `Recorded effective ownership would exceed 100% (${(existingOwnership + effectiveOwnership).toFixed(2)}%)` }, { status: 400 });
  }
  const record: UboRecord = {
    id: randomUUID(), companyName, companyCr,
    ownershipPath,
    naturalPersonName, naturalPersonIdentifier,
    nationality: text(body.nationality) || "UNKNOWN",
    companyRoutePercent, naturalPersonPercent, effectiveOwnership,
    controlBasis: text(body.controlBasis) || "Ownership only",
    controlDetails: text(body.controlDetails) || "Not recorded",
    pepDeclared,
    kycStatus: text(body.kycStatus) || "Pending",
    verificationStatus: text(body.verificationStatus) || "Unverified",
    verifiedDate: text(body.verifiedDate),
    nextReviewDate: text(body.nextReviewDate),
    sourceReference: text(body.sourceReference) || "Not recorded",
    createdAt: new Date().toISOString(), createdBy: user.fullName,
  };
  store.uboRecords.unshift(record);
  const activeIds = new Set(store.watchlistVersions.filter(version => version.active).map(version => version.id));
  const activeEntries = store.watchlistEntries.filter(entry => activeIds.has(entry.versionId));
  const matches = screenEntries(activeEntries, { name: naturalPersonName, identifier: naturalPersonIdentifier });
  if (matches.length) {
    (store.cases as Array<Record<string, unknown>>).unshift({
      id: `UBO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      entity: naturalPersonName,
      detail: `${matches.length} potential watchlist match(es) for UBO/control person of ${companyName}; top score ${matches[0].score}%`,
      type: "UBO", priority: matches[0].score >= 90 ? "Critical" : "High",
      owner: "Unassigned", status: "New", age: "Now",
    });
  }
  if (pepDeclared === "YES") {
    (store.cases as Array<Record<string, unknown>>).unshift({
      id: `PEP-${new Date().getFullYear()}-${String(Date.now() + 1).slice(-6)}`,
      entity: naturalPersonName,
      detail: `PEP declared for UBO/control person of ${companyName}; Compliance qualification and enhanced due diligence assessment required`,
      type: "PEP", priority: "High", owner: "Unassigned", status: "New", age: "Now",
    });
  }
  addActivity(store, user.fullName, "UBO_RECORD_CREATED", `${companyName} · ${naturalPersonName} · ${effectiveOwnership}% effective · ${qualifiesAsUbo(effectiveOwnership, record.controlBasis) ? "UBO/control qualification" : "below ownership threshold"}`);
  writeStore(store);
  const aggregate = aggregateUboRoutes(store.uboRecords).find(item =>
    item.companyCr.toUpperCase() === companyCr.toUpperCase() &&
    (naturalPersonIdentifier
      ? item.naturalPersonIdentifier.toUpperCase() === naturalPersonIdentifier.toUpperCase()
      : item.naturalPersonName.toUpperCase() === naturalPersonName.toUpperCase())
  );
  return NextResponse.json({ record, aggregate, potentialMatches: matches.length });
}
