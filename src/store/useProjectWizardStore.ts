import { create } from "zustand";
import type { EbookPlan } from "@/lib/ebook-generation";
import type { EbookStyle, ProjectSource } from "@/types/project";

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export type WizardTone =
  | "preserve"
  | "clear"
  | "practical"
  | "editorial"
  | "friendly";

export type WizardPurpose =
  | ""
  | "sell"
  | "teach"
  | "organize"
  | "report"
  | "other";

type WizardState = {
  step: WizardStep;
  // Step 1: Basics
  title: string;
  author: string;
  targetAudience: string;
  purpose: WizardPurpose;
  purposeDetail: string;
  tone: WizardTone;
  // Step 2: Style
  ebookStyle: EbookStyle | null;
  // Step 2: Style
  accentColor: string;
  // Step 3: Source
  sourceFiles: ProjectSource[];
  // Step 4: Plan
  plan: EbookPlan | null;
  planning: boolean;
  // Step 5: Generate
  generating: boolean;
  error: string;

  setStep: (step: WizardStep) => void;
  setField: (field: "title" | "author" | "targetAudience" | "purposeDetail", value: string) => void;
  setPurpose: (purpose: WizardPurpose) => void;
  setTone: (tone: WizardTone) => void;
  setSourceFiles: (sources: ProjectSource[]) => void;
  setEbookStyle: (style: EbookStyle) => void;
  setAccentColor: (color: string) => void;
  setPlan: (plan: EbookPlan | null) => void;
  setPlanning: (value: boolean) => void;
  setGenerating: (value: boolean) => void;
  setError: (value: string) => void;
  reset: () => void;
};

const initialState = {
  step: 1 as WizardStep,
  title: "",
  author: "",
  targetAudience: "",
  purpose: "" as WizardPurpose,
  purposeDetail: "",
  tone: "preserve" as WizardTone,
  ebookStyle: null as EbookStyle | null,
  accentColor: "#6366f1",
  sourceFiles: [],
  plan: null as EbookPlan | null,
  planning: false,
  generating: false,
  error: "",
};

export const useProjectWizardStore = create<WizardState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step, error: "" }),
  setField: (field, value) => set({ [field]: value, plan: null, error: "" }),
  setPurpose: (purpose) => set({ purpose, purposeDetail: purpose === "other" ? "" : "", plan: null, error: "" }),
  setTone: (tone) => set({ tone, plan: null, error: "" }),
  setSourceFiles: (sourceFiles) => set({ sourceFiles, plan: null, error: "" }),
  setEbookStyle: (ebookStyle) => set({ ebookStyle, plan: null, error: "" }),
  setAccentColor: (accentColor) => set({ accentColor, plan: null }),
  setPlan: (plan) => set({ plan, error: "" }),
  setPlanning: (planning) => set({ planning }),
  setGenerating: (generating) => set({ generating }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
