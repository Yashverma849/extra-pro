import "server-only";
import { randomUUID } from "node:crypto";
import type { WatchlistEntry } from "./server-store";

function decodeXml(value: string) {
  return value.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&apos;", "'").trim();
}

function tag(block: string, name: string) {
  return decodeXml(block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"))?.[1] || "");
}

function tags(block: string, name: string) {
  return [...block.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "gi"))].map(match => decodeXml(match[1])).filter(Boolean);
}

function valuesWithin(block: string, parent: string) {
  const parentBlock = block.match(new RegExp(`<${parent}>([\\s\\S]*?)</${parent}>`, "i"))?.[1] || "";
  return tags(parentBlock, "VALUE");
}

function namesFrom(block: string) {
  return ["FIRST_NAME","SECOND_NAME","THIRD_NAME","FOURTH_NAME"].map(name => tag(block, name)).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export function parseUnXml(xml: string, versionId: string): { generated: string; entries: WatchlistEntry[] } {
  if (!/<CONSOLIDATED_LIST[\s>]/i.test(xml)) throw new Error("This is not a UN Consolidated List XML file");
  const generated = xml.match(/dateGenerated="([^"]+)"/i)?.[1] || "";
  const entries: WatchlistEntry[] = [];
  const groups: Array<["Individual" | "Entity", RegExp]> = [
    ["Individual", /<INDIVIDUAL>([\s\S]*?)<\/INDIVIDUAL>/gi],
    ["Entity", /<ENTITY>([\s\S]*?)<\/ENTITY>/gi],
  ];
  for (const [partyType, pattern] of groups) {
    for (const match of xml.matchAll(pattern)) {
      const block = match[1];
      const aliases = partyType === "Individual" ? tags(block, "ALIAS_NAME") : [...tags(block, "ALIAS_NAME"), ...tags(block, "NAME_ORIGINAL_SCRIPT")];
      const documents = [...tags(block, "NUMBER"), ...tags(block, "ISSUING_COUNTRY")];
      const dobs = [...tags(block, "DATE"), ...tags(block, "YEAR")].filter(value => /^\d{4}(-\d{2}-\d{2})?$/.test(value));
      entries.push({
        id: randomUUID(),
        versionId,
        category: "UN Consolidated List",
        partyType,
        primaryName: namesFrom(block),
        aliases: [...new Set(aliases)],
        referenceNumber: tag(block, "REFERENCE_NUMBER"),
        dataId: tag(block, "DATAID"),
        dateOfBirth: [...new Set(dobs)],
        nationalities: [...new Set(valuesWithin(block, partyType === "Individual" ? "NATIONALITY" : "ENTITY_ADDRESS"))],
        identifiers: [...new Set(documents)],
        remarks: tag(block, "COMMENTS1"),
      });
    }
  }
  if (!entries.length) throw new Error("No UN individuals or entities were found in the XML file");
  return { generated, entries };
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim()); cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows;
}

export function parseStandardCsv(text: string, versionId: string, category: string): WatchlistEntry[] {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("The CSV contains no watchlist records");
  const headers = rows[0].map(value => value.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const at = (row: string[], ...names: string[]) => {
    const index = headers.findIndex(header => names.includes(header));
    return index >= 0 ? row[index] || "" : "";
  };
  const entries = rows.slice(1).map(row => {
    const primaryName = at(row, "name", "fullname", "primaryname", "entityname");
    return {
      id: randomUUID(), versionId, category,
      partyType: /entity|organisation|organization|company/i.test(at(row, "partytype", "type")) ? "Entity" as const : "Individual" as const,
      primaryName,
      aliases: at(row, "aliases", "alias", "alternatenames").split("|").map(v => v.trim()).filter(Boolean),
      referenceNumber: at(row, "referencenumber", "reference", "refno"),
      dataId: at(row, "dataid", "recordid", "id"),
      dateOfBirth: at(row, "dateofbirth", "dob").split("|").map(v => v.trim()).filter(Boolean),
      nationalities: at(row, "nationality", "nationalities", "country").split("|").map(v => v.trim()).filter(Boolean),
      identifiers: at(row, "identifiers", "identifier", "passport", "civilid", "crnumber").split("|").map(v => v.trim()).filter(Boolean),
      remarks: at(row, "remarks", "comments", "reason", "position"),
    };
  }).filter(entry => entry.primaryName);
  if (!entries.length) throw new Error("No names were found. Include a Name or Full Name column");
  return entries;
}

export function normalizeName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\b(the|co|company|llc|saoc|saog|ltd|limited)\b/g, " ").replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").replace(/\s+/g, " ").trim();
}

export function duplicateEntries(entries: WatchlistEntry[]) {
  const seen = new Map<string, WatchlistEntry>();
  const duplicates: { first: WatchlistEntry; duplicate: WatchlistEntry }[] = [];
  for (const entry of entries) {
    const identity = entry.referenceNumber || entry.dataId || entry.identifiers.slice().sort().join("|");
    const key = `${entry.partyType}|${normalizeName(entry.primaryName)}|${identity.toLowerCase().replace(/\s/g, "")}`;
    const first = seen.get(key);
    if (first) duplicates.push({ first, duplicate: entry });
    else seen.set(key, entry);
  }
  return duplicates;
}

function diceSimilarity(left: string, right: string) {
  const a = normalizeName(left), b = normalizeName(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigrams = (value: string) => {
    const result: string[] = [];
    for (let i = 0; i < value.length - 1; i++) result.push(value.slice(i, i + 2));
    return result;
  };
  const aa = bigrams(a), bb = bigrams(b);
  const counts = new Map<string, number>();
  aa.forEach(item => counts.set(item, (counts.get(item) || 0) + 1));
  let matches = 0;
  bb.forEach(item => { const count = counts.get(item) || 0; if (count) { matches++; counts.set(item, count - 1); } });
  return (2 * matches) / (aa.length + bb.length || 1);
}

export function screenEntries(entries: WatchlistEntry[], input: { name: string; identifier?: string; scope?: string }) {
  const identifier = (input.identifier || "").replace(/\s/g, "").toLowerCase();
  return entries.flatMap(entry => {
    if (input.scope && input.scope !== "All active lists" && input.scope !== "Sanctions only" && !entry.category.toLowerCase().includes(input.scope.replace(" only","").toLowerCase())) return [];
    const candidates = [entry.primaryName, ...entry.aliases];
    const similarity = Math.max(...candidates.map(name => diceSimilarity(input.name, name)));
    const idMatch = Boolean(identifier && entry.identifiers.some(value => value.replace(/\s/g, "").toLowerCase() === identifier));
    const score = Math.min(100, Math.round(similarity * 100 + (idMatch ? 15 : 0)));
    return score >= 65 || idMatch ? [{ entry, score, idMatch }] : [];
  }).sort((a, b) => b.score - a.score).slice(0, 20);
}
