import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { addActivity, readStore, writeStore, type WatchlistVersion } from "@/lib/server-store";
import { duplicateEntries, parseStandardCsv, parseUnXml } from "@/lib/watchlists";
import { rescreenPortfolio } from "@/lib/portfolio-screening";

export const runtime = "nodejs";

export async function GET() {
  if (!await currentUser()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = readStore();
  return NextResponse.json({ versions: store.watchlistVersions, sources: store.watchlistSources, totalEntries: store.watchlistEntries.length });
}

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user || !["ADMIN", "COMPLIANCE"].includes(user.role)) return NextResponse.json({ error: "Compliance or Admin access is required" }, { status: 403 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a watchlist file" }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "Watchlist file exceeds 20 MB" }, { status: 400 });
  const sourceId = String(form.get("sourceId") || "");
  const effectiveDate = String(form.get("effectiveDate") || "");
  const suppliedVersion = String(form.get("version") || "").trim();
  if (!sourceId || !effectiveDate) return NextResponse.json({ error: "Watchlist source and effective date are required" }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(bytes).digest("hex");
  const store = readStore();
  const configuredSource = store.watchlistSources.find(item => item.id === sourceId && item.active);
  if (!configuredSource) return NextResponse.json({ error: "Choose an active configured watchlist source" }, { status: 400 });
  if (store.watchlistVersions.some(version => version.fileHash === fileHash)) return NextResponse.json({ error: "This exact file has already been uploaded" }, { status: 409 });
  const versionId = randomUUID();
  try {
    const isUn = configuredSource.format === "UN_XML";
    if (isUn && !file.name.toLowerCase().endsWith(".xml")) throw new Error("UN Consolidated List uploads must use the official XML format");
    if (!isUn && !file.name.toLowerCase().endsWith(".csv")) throw new Error(`${configuredSource.name} uploads must use the standard CSV format`);
    const content = bytes.toString("utf8");
    const parsed = isUn ? parseUnXml(content, versionId) : { generated: "", entries: parseStandardCsv(content, versionId, configuredSource.name) };
    const duplicates = duplicateEntries(parsed.entries);
    if (duplicates.length) throw new Error(`Upload rejected: ${duplicates.length} duplicate record(s) found. Remove duplicates and upload again.`);
    const extension = extname(file.name).toLowerCase();
    const version: WatchlistVersion = {
      id: versionId, sourceId: configuredSource.id, category: configuredSource.name,
      classification: configuredSource.classification, treatment: configuredSource.treatment,
      source: configuredSource.authority, version: suppliedVersion || parsed.generated || effectiveDate,
      effectiveDate, uploadedAt: new Date().toISOString(), uploadedBy: user.fullName,
      filename: file.name, fileHash, recordCount: parsed.entries.length, active: true,
      sourceFilePath: `watchlists/${versionId}/original${extension}`,
      screeningStartedAt: new Date().toISOString(), screeningCompletedAt: "",
      partiesScreened: 0, uboRecordsScreened: 0, matchesCreated: 0, screeningErrors: 0,
    };
    store.watchlistVersions.filter(item => item.category === configuredSource.name).forEach(item => item.active = false);
    store.watchlistVersions.unshift(version);
    store.watchlistEntries.push(...parsed.entries);
    const storedDir = join(process.cwd(), "data", "watchlists", versionId);
    mkdirSync(storedDir, { recursive: true });
    writeFileSync(join(storedDir, `original${extension}`), bytes);
    const screening = rescreenPortfolio(store, parsed.entries, configuredSource, version);
    Object.assign(version, screening, { screeningCompletedAt: new Date().toISOString() });
    if (store.routines[0]) store.routines[0].screening = "Completed";
    addActivity(store, user.fullName, "WATCHLIST_ACTIVATED", `${configuredSource.name} · ${version.recordCount} records · ${screening.partiesScreened} parties and ${screening.uboRecordsScreened} UBO record(s) screened · ${screening.matchesCreated} case(s) · SHA-256 ${fileHash}`);
    writeStore(store);
    return NextResponse.json({ version, portfolioMatches: screening.matchesCreated, screening });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process watchlist" }, { status: 400 });
  }
}
