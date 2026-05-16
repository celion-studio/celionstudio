import assert from "node:assert/strict";
import test from "node:test";
import { getSafeAuthNext } from "./auth-redirect";

test("getSafeAuthNext preserves dashboard and editor destinations", () => {
  assert.equal(getSafeAuthNext("/dashboard?view=trash"), "/dashboard?view=trash");
  assert.equal(getSafeAuthNext("/editor/project-123"), "/editor/project-123");
});

test("getSafeAuthNext rejects unsafe or recursive auth destinations", () => {
  assert.equal(getSafeAuthNext("https://example.com/dashboard"), "/dashboard");
  assert.equal(getSafeAuthNext("//example.com/dashboard"), "/dashboard");
  assert.equal(getSafeAuthNext("/auth?mode=sign-in&next=/dashboard"), "/dashboard");
  assert.equal(getSafeAuthNext("/auth/sign-in"), "/dashboard");
});
