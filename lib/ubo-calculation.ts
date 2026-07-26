export function calculateEffectiveOwnership(companyRoutePercent: number, naturalPersonPercent: number) {
  const companyRoute = Number.isFinite(companyRoutePercent) ? Math.min(100, Math.max(0, companyRoutePercent)) : 0;
  const naturalPerson = Number.isFinite(naturalPersonPercent) ? Math.min(100, Math.max(0, naturalPersonPercent)) : 0;
  return Number(((companyRoute * naturalPerson) / 100).toFixed(4));
}

export function qualifiesAsUbo(effectiveOwnership: number, controlBasis: string) {
  return effectiveOwnership >= 25 || String(controlBasis || "").trim().toUpperCase() !== "OWNERSHIP ONLY";
}

export type UboRoute = {
  id?: string;
  companyName?: string;
  companyCr: string;
  naturalPersonName: string;
  naturalPersonIdentifier?: string;
  effectiveOwnership: number;
  controlBasis: string;
};

const normalized = (value: string | undefined) => String(value || "").trim().toUpperCase();

export function aggregateUboRoutes<T extends UboRoute>(records: T[]) {
  const groups = new Map<string, { companyName: string; companyCr: string; naturalPersonName: string; naturalPersonIdentifier: string; totalEffectiveOwnership: number; routeCount: number; controlQualification: boolean; records: T[] }>();
  for (const record of records) {
    const identity = normalized(record.naturalPersonIdentifier) || normalized(record.naturalPersonName);
    const key = `${normalized(record.companyCr)}::${identity}`;
    const current = groups.get(key) || {
      companyName: record.companyName || "",
      companyCr: record.companyCr,
      naturalPersonName: record.naturalPersonName,
      naturalPersonIdentifier: record.naturalPersonIdentifier || "",
      totalEffectiveOwnership: 0,
      routeCount: 0,
      controlQualification: false,
      records: [],
    };
    current.totalEffectiveOwnership = Math.round((current.totalEffectiveOwnership + Number(record.effectiveOwnership || 0)) * 10_000) / 10_000;
    current.routeCount++;
    current.controlQualification ||= normalized(record.controlBasis) !== "OWNERSHIP ONLY";
    current.records.push(record);
    groups.set(key, current);
  }
  return [...groups.values()].map(group => ({
    ...group,
    qualifiesByOwnership: group.totalEffectiveOwnership >= 25,
    qualifiesByControl: group.controlQualification,
    qualifiesAsUbo: group.totalEffectiveOwnership >= 25 || group.controlQualification,
  }));
}

export function hasCircularOwnershipPath(path: string) {
  const nodes = String(path || "").split(/\s*(?:→|->|>|\/)\s*/).map(normalized).filter(Boolean);
  return new Set(nodes).size !== nodes.length;
}
