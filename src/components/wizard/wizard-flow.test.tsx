import assert from "node:assert/strict";
import test from "node:test";
import type { ReactElement, ReactNode } from "react";
import { BasicsStep } from "./BasicsStep";
import { StyleStep } from "./StyleStep";
import {
  STEP_DESCRIPTIONS,
  STEP_LABELS,
  STEP_TITLES,
  TOTAL_STEPS,
} from "./WizardContent";

function collectText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  if (typeof node === "object" && "props" in node) {
    const element = node as ReactElement<{ children?: ReactNode }>;
    return collectText(element.props.children);
  }
  return "";
}

test("wizard metadata uses the four-step ebook flow", () => {
  assert.equal(TOTAL_STEPS, 4);
  assert.deepEqual(STEP_LABELS, ["Basics", "Style", "Source", "Generate"]);
  assert.equal(STEP_TITLES.length, TOTAL_STEPS);
  assert.equal(STEP_DESCRIPTIONS.length, TOTAL_STEPS);
});

test("style step includes accent color presets", () => {
  const step = StyleStep({
    ebookStyle: "minimal",
    onStyleChange: () => {},
    accentColor: "#6366f1",
    onAccentColorChange: () => {},
  } as Parameters<typeof StyleStep>[0]);

  const text = collectText(step).replace(/\s+/g, " ");

  assert.match(text, /Accent color/);
  assert.match(text, /Selected:\s+Indigo\s+\(\s*#6366f1\s*\)/);
});

test("basics step uses a purpose dropdown without onboarding or sharing presets", () => {
  const step = BasicsStep({
    title: "",
    author: "",
    targetAudience: "",
    purpose: "",
    purposeDetail: "",
    tone: "preserve",
    onFieldChange: () => {},
    onPurposeChange: () => {},
    onToneChange: () => {},
  } as Parameters<typeof BasicsStep>[0]);

  const text = collectText(step).replace(/\s+/g, " ");

  assert.match(text, /Select a purpose/);
  assert.match(text, /Sell or promote/);
  assert.match(text, /Teach a method/);
  assert.match(text, /Organize expertise/);
  assert.match(text, /Report or brief/);
  assert.match(text, /Other/);
  assert.doesNotMatch(text, /Onboarding|Sharing/);
});
