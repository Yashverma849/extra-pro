export type ConfigurableClassification = "ADDITIONAL_EXTERNAL" | "PEP" | "INTERNAL";

export const configurableClassifications: ConfigurableClassification[] = ["ADDITIONAL_EXTERNAL", "PEP", "INTERNAL"];

export function canCreateSourceClassification(value: string): value is ConfigurableClassification {
  return configurableClassifications.includes(value as ConfigurableClassification);
}

export function canDisableWatchlistSource(source: { statutoryLocked: boolean }) {
  return !source.statutoryLocked;
}
