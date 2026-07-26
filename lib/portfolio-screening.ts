import { randomUUID } from "node:crypto";
import type { CaseRecord, PortalStore, WatchlistEntry, WatchlistSource, WatchlistVersion } from "./server-store";
import { screenEntries } from "./watchlists";

const text = (value: unknown) => String(value ?? "").trim();

export function rescreenPortfolio(store: PortalStore, entries: WatchlistEntry[], source: WatchlistSource, version: WatchlistVersion) {
  let partiesScreened = 0;
  let uboRecordsScreened = 0;
  let matchesCreated = 0;
  let screeningErrors = 0;
  const candidates = [
    ...store.customers.map(customer => ({ kind: "Party", name: text(customer.name), identifier: text(customer.identifier), context: text(customer.id) })),
    ...store.uboRecords.map(record => ({ kind: "UBO", name: record.naturalPersonName, identifier: record.naturalPersonIdentifier, context: `${record.companyName} (${record.companyCr})` })),
  ];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate.name) { screeningErrors++; continue; }
    candidate.kind === "UBO" ? uboRecordsScreened++ : partiesScreened++;
    const candidateKey = `${candidate.kind}:${candidate.identifier || candidate.name.toUpperCase()}`;
    if (seen.has(candidateKey)) continue;
    seen.add(candidateKey);
    const matches = screenEntries(entries, { name: candidate.name, identifier: candidate.identifier });
    for (const match of matches.slice(0, 3)) {
      const screeningKey = `${version.id}:${candidateKey}:${match.entry.id}`;
      if (store.cases.some(item => item.screeningKey === screeningKey)) continue;
      const item: CaseRecord = {
        id: `AML-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
        entity: candidate.name,
        detail: `${candidate.kind} potential match after ${source.name} update; ${candidate.context}; ${source.classification}; score ${match.score}%`,
        type: source.classification === "PEP" ? "PEP" : candidate.kind === "UBO" ? "UBO" : "Sanctions",
        priority: source.classification === "MANDATORY_OMAN_TFS" && match.score >= 90 ? "Critical" : "High",
        owner: "Unassigned", status: "New", age: "Now", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        history: [], screeningKey,
      };
      store.cases.unshift(item);
      matchesCreated++;
    }
  }
  return { partiesScreened, uboRecordsScreened, matchesCreated, screeningErrors };
}
