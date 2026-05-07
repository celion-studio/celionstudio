import assert from "node:assert/strict";
import test from "node:test";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BasicsStep } from "./BasicsStep";
import { PlanStepEbook } from "./PlanStepEbook";
import { StyleStep } from "./StyleStep";
import {
  STEP_DESCRIPTIONS,
  STEP_LABELS,
  STEP_TITLES,
  TOTAL_STEPS,
  getStepIssue,
} from "./WizardContent";
import { useProjectWizardStore } from "@/store/useProjectWizardStore";
import type { EbookPlan } from "@/lib/ebook-generation";
import type { ProjectSource } from "@/types/project";

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

function validWizardPlan(): EbookPlan {
  return {
    title: "Launch brief",
    subtitle: "A useful planning document",
    author: "Celion",
    targetAudience: "Founders",
    readerPromise: "Understand the launch plan",
    language: "English",
    sourceAssessment: {
      sourceScale: "medium",
      detectedSections: ["Offer", "Audience"],
      essentialSections: ["Offer"],
      compressionRisk: "low",
      recommendedSlideCount: 10,
      coveragePlan: ["Open with the main promise"],
      rationale: "The source is compact.",
    },
    cover: {
      eyebrow: "Guide",
      title: "Launch brief",
      subtitle: "A useful planning document",
      promise: "Understand the launch plan",
      visualDirection: "Simple typographic cover",
    },
    editorialStrategy: {
      angle: "Practical launch clarity",
      readerProblem: "The offer feels scattered",
      promisedOutcome: "A clearer launch narrative",
      narrativeArc: "Problem to method to checklist",
    },
    designBrief: {
      mood: "Minimal",
      visualSystem: "Strong type and clean rules",
      coverConcept: "Large title with one accent mark",
      layoutRhythm: "Alternate text-led and checklist slides",
      avoid: ["generic icons"],
    },
    slides: Array.from({ length: 10 }, (_, index) => ({
      role: index === 0 ? "cover" : "insight",
      eyebrow: "Section",
      headline: `Slide ${index + 1}`,
      body: "A concise source-backed slide body.",
      evidence: "Source detail",
      sourceAnchors: ["source phrase"],
      visualDirection: "Simple editorial layout",
    })),
  };
}

test("wizard metadata uses the five-step ebook flow", () => {
  assert.equal(TOTAL_STEPS, 5);
  assert.deepEqual(STEP_LABELS, ["Basics", "Style", "Source", "Plan", "Generate"]);
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
    onFieldChange: () => {},
    onPurposeChange: () => {},
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

test("source step requires at least one source file", () => {
  const state = useProjectWizardStore.getState();

  assert.equal(
    getStepIssue(3, { ...state, sourceFiles: [] }),
    "Add at least one source file to continue.",
  );

  const source: ProjectSource = {
    id: "source-1",
    kind: "txt",
    name: "notes.txt",
    content: "A source note",
    excerpt: "A source note",
  };

  assert.equal(getStepIssue(3, { ...state, sourceFiles: [source] }), null);
});

test("plan step requires a generated plan", () => {
  const state = useProjectWizardStore.getState();

  assert.equal(
    getStepIssue(4, { ...state, plan: null }),
    "Create a plan to continue.",
  );

  const plan = validWizardPlan();

  assert.equal(getStepIssue(4, { ...state, plan }), null);
});

test("plan step exposes source, regenerate, and edit actions", () => {
  const text = renderToStaticMarkup(
    <PlanStepEbook
      plan={validWizardPlan()}
      onBackToSource={() => {}}
      onRegeneratePlan={() => {}}
      onPlanChange={() => {}}
    />,
  ).replace(/\s+/g, " ");

  assert.match(text, /Back to source/);
  assert.match(text, /Regenerate/);
  assert.match(text, /Edit plan/);
});
