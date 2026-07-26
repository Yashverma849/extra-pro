import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { validateCaseTransition } from "@/lib/case-workflow";
import { addActivity, updateStore, type CaseStatus } from "@/lib/server-store";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user || !["ADMIN", "COMPLIANCE", "REVIEWER"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json();
  const next = String(body.status || "") as CaseStatus;
  const reason = String(body.reason || "").trim();
  const response = String(body.operationsResponse || "").trim();
  const evidenceReference = String(body.evidenceReference || "").trim();
  try {
    const item = updateStore(store => {
      const current = store.cases.find(record => record.id === id);
      if (!current) throw new Error("Case not found");
      const validation = validateCaseTransition(current, next, reason, response);
      if (validation) throw new Error(validation);
      const previous = current.status;
      current.status = next;
      current.updatedAt = new Date().toISOString();
      current.decisionReason = reason;
      if (response) current.operationsResponse = response;
      if (evidenceReference) current.evidenceReference = evidenceReference;
      current.history ||= [];
      current.history.push({ at: current.updatedAt, by: user.fullName, from: previous, to: next, reason, response: response || undefined, evidenceReference: evidenceReference || undefined });
      addActivity(store, user.fullName, "CASE_STATUS_UPDATED", `${current.id} · ${previous} → ${next} · ${reason}`);
      return current;
    });
    return NextResponse.json({ case: item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update case";
    return NextResponse.json({ error: message }, { status: message === "Case not found" ? 404 : 400 });
  }
}

