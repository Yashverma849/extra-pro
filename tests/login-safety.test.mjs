import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const route = await readFile(new URL("../app/api/session/route.ts", import.meta.url), "utf8");

test("login form has a safe POST fallback and explicit submit control", () => {
  assert.match(page, /<form method="post" action="\/api\/session" onSubmit=\{submit\}>/);
  assert.match(page, /<button type="submit"/);
  assert.doesNotMatch(page, /<form onSubmit=\{submit\}>/);
});

test("login removes accidental query-string credentials from the address bar", () => {
  assert.match(page, /window\.history\.replaceState\(\{\}, "", window\.location\.pathname\)/);
});

test("session endpoint accepts JSON and form submissions without logging credentials", () => {
  assert.match(route, /contentType\.includes\("application\/json"\)/);
  assert.match(route, /await request\.formData\(\)/);
  assert.match(route, /NextResponse\.redirect\(new URL\("\/", request\.url\), 303\)/);
  assert.doesNotMatch(route, /console\.(log|error)\([^)]*(username|password)/i);
});
