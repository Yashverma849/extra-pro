import assert from "node:assert/strict";
import test from "node:test";
import { validateCaseTransition } from "../lib/case-workflow.ts";

const caseRecord = { id: "C1", entity: "Party", detail: "Match", type: "Screening", priority: "High", owner: "Officer", status: "New", age: "0 days" };

test("case closure cannot bypass investigation and response controls", () => {
  assert.match(validateCaseTransition(caseRecord, "Closed", "close", ""), /not permitted/);
});

test("operations response is mandatory before response status", () => {
  const communicated = { ...caseRecord, status: "Communicated to Operations" };
  assert.match(validateCaseTransition(communicated, "Operations response received", "Reviewed", ""), /response is required/);
  assert.equal(validateCaseTransition(communicated, "Operations response received", "Reviewed", "Operations confirmed hold"), "");
});

test("decision reason is mandatory", () => {
  assert.match(validateCaseTransition(caseRecord, "Under review", "", ""), /reason is required/);
});
