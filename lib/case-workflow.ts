import type { CaseRecord, CaseStatus } from "./server-store";

export const CASE_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  "New": ["Under review", "Information requested", "Escalated to MLRO", "Communicated to Operations", "False positive"],
  "Under review": ["Information requested", "Escalated to MLRO", "Communicated to Operations", "False positive"],
  "Information requested": ["Under review", "Escalated to MLRO", "Communicated to Operations", "False positive"],
  "Escalated to MLRO": ["Under review", "Communicated to Operations", "False positive"],
  "Communicated to Operations": ["Operations response received", "Escalated to MLRO"],
  "Operations response received": ["Closed", "Under review", "Escalated to MLRO"],
  "False positive": ["Closed", "Under review"],
  "Closed": [],
};

export function validateCaseTransition(item: CaseRecord, next: CaseStatus, reason: string, response: string) {
  if (!CASE_TRANSITIONS[item.status]?.includes(next)) return `Transition from ${item.status} to ${next} is not permitted`;
  if (!reason.trim()) return "Decision reason is required";
  if (next === "Operations response received" && !response.trim()) return "Operations response is required";
  if (next === "Closed" && item.status === "Operations response received" && !(response.trim() || item.operationsResponse?.trim())) return "Recorded Operations response is required before closure";
  return "";
}

