import { create } from "zustand";
import type { EbookStyle, ProjectSource } from "@/types/project";

export type WizardStep = 1 | 2 | 3 | 4;

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
  // Step 4: Generate
  generating: boolean;
  error: string;

  setStep: (step: WizardStep) => void;
  setField: (field: "title" | "author" | "targetAudience" | "purposeDetail", value: string) => void;
  setPurpose: (purpose: WizardPurpose) => void;
  setTone: (tone: WizardTone) => void;
  setSourceFiles: (sources: ProjectSource[]) => void;
  setEbookStyle: (style: EbookStyle) => void;
  setAccentColor: (color: string) => void;
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
  generating: false,
  error: "",
};

export const useProjectWizardStore = create<WizardState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step, error: "" }),
  setField: (field, value) => set({ [field]: value, error: "" }),
  setPurpose: (purpose) => set({ purpose, purposeDetail: purpose === "other" ? "" : "", error: "" }),
  setTone: (tone) => set({ tone, error: "" }),
  setSourceFiles: (sourceFiles) => set({ sourceFiles, error: "" }),
  setEbookStyle: (ebookStyle) => set({ ebookStyle, error: "" }),
  setAccentColor: (accentColor) => set({ accentColor }),
  setGenerating: (generating) => set({ generating }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
