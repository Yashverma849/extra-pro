export type PepDeclaration = "YES" | "NO" | "UNKNOWN";

export type PepIntake = {
  declared: PepDeclaration;
  category: string;
  publicPosition: string;
  country: string;
  relatedPerson: string;
  sourceReference: string;
  requiresReview: boolean;
  inconsistent: boolean;
};

const textOrUnknown = (value: unknown) => String(value ?? "").trim() || "UNKNOWN";

export function normalizePepDeclaration(value: unknown): PepDeclaration | null {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text || text === "UNKNOWN" || text === "NOT AVAILABLE" || text === "N/A") return "UNKNOWN";
  if (["YES", "Y", "TRUE", "1"].includes(text)) return "YES";
  if (["NO", "N", "FALSE", "0"].includes(text)) return "NO";
  return null;
}

export function assessPepIntake(row: Record<string, unknown>): PepIntake {
  const declared = normalizePepDeclaration(row.PEP_DECLARED) ?? "UNKNOWN";
  const category = textOrUnknown(row.PEP_CATEGORY);
  const publicPosition = textOrUnknown(row.PUBLIC_POSITION);
  const country = textOrUnknown(row.PEP_COUNTRY);
  const relatedPerson = textOrUnknown(row.PEP_RELATED_PERSON);
  const sourceReference = textOrUnknown(row.PEP_SOURCE_REFERENCE);
  const hasSupportingIndicator = [category, publicPosition, country, relatedPerson, sourceReference]
    .some(value => !["UNKNOWN", "NONE", "NO"].includes(value.toUpperCase()));

  return {
    declared,
    category,
    publicPosition,
    country,
    relatedPerson,
    sourceReference,
    requiresReview: declared === "YES" || hasSupportingIndicator,
    inconsistent: declared === "NO" && hasSupportingIndicator,
  };
}
