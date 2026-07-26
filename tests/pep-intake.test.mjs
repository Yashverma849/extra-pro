import assert from "node:assert/strict";
import test from "node:test";
import { assessPepIntake, normalizePepDeclaration } from "../lib/pep-intake.ts";

test("blank PEP declaration is Unknown and not treated as No", () => {
  assert.equal(normalizePepDeclaration(""), "UNKNOWN");
  const result = assessPepIntake({});
  assert.equal(result.declared, "UNKNOWN");
  assert.equal(result.requiresReview, false);
});

test("declared or supporting PEP information creates a review flag", () => {
  assert.equal(assessPepIntake({ PEP_DECLARED: "Yes" }).requiresReview, true);
  assert.equal(assessPepIntake({ PUBLIC_POSITION: "Minister" }).requiresReview, true);
});

test("No with supporting PEP information is treated as inconsistent", () => {
  const result = assessPepIntake({ PEP_DECLARED: "No", PEP_CATEGORY: "Foreign PEP" });
  assert.equal(result.inconsistent, true);
  assert.equal(result.requiresReview, true);
});

test("invalid declarations are rejected by the value normalizer", () => {
  assert.equal(normalizePepDeclaration("maybe"), null);
});
