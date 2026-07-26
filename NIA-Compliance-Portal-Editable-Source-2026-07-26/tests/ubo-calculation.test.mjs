import assert from "node:assert/strict";
import test from "node:test";
import { aggregateUboRoutes, calculateEffectiveOwnership, hasCircularOwnershipPath, qualifiesAsUbo } from "../lib/ubo-calculation.ts";

test("calculates indirect effective ownership", () => {
  assert.equal(calculateEffectiveOwnership(70, 60), 42);
});

test("aggregates multiple ownership routes for the same natural person", () => {
  const [result] = aggregateUboRoutes([
    { companyCr: "123", naturalPersonName: "Person A", naturalPersonIdentifier: "CID1", effectiveOwnership: 10, controlBasis: "Ownership only" },
    { companyCr: "123", naturalPersonName: "Person A", naturalPersonIdentifier: "CID1", effectiveOwnership: 18, controlBasis: "Ownership only" },
  ]);
  assert.equal(result.totalEffectiveOwnership, 28);
  assert.equal(result.routeCount, 2);
  assert.equal(result.qualifiesAsUbo, true);
});

test("detects a repeated entity in an ownership path", () => {
  assert.equal(hasCircularOwnershipPath("Insured -> Holding A -> Insured"), true);
  assert.equal(hasCircularOwnershipPath("Holding A -> Holding B -> Insured"), false);
});

test("qualifies by ownership threshold or other control", () => {
  assert.equal(qualifiesAsUbo(25, "Ownership only"), true);
  assert.equal(qualifiesAsUbo(10, "Right to appoint directors"), true);
  assert.equal(qualifiesAsUbo(10, "Ownership only"), false);
});
