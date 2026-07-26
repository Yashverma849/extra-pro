import assert from "node:assert/strict";
import test from "node:test";
import { canCreateSourceClassification, canDisableWatchlistSource } from "../lib/watchlist-source-policy.ts";

test("reserves mandatory Oman TFS classification for protected system sources", () => {
  assert.equal(canCreateSourceClassification("MANDATORY_OMAN_TFS"), false);
  assert.equal(canCreateSourceClassification("ADDITIONAL_EXTERNAL"), true);
  assert.equal(canCreateSourceClassification("PEP"), true);
  assert.equal(canCreateSourceClassification("INTERNAL"), true);
});

test("prevents disabling protected UN and Oman sources", () => {
  assert.equal(canDisableWatchlistSource({ statutoryLocked: true }), false);
  assert.equal(canDisableWatchlistSource({ statutoryLocked: false }), true);
});
