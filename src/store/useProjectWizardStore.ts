import { create } from "zustand";
import type { EbookStyle, ProjectSource } from "@/types/project";

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export type WizardTone =
  | "preserve"
  | "clear"
  | "practical"
  | "editorial"
  | "friendly";

type WizardState = {
  step: WizardStep;
  // Step 1: Basics
  title: string;
  author: string;
  targetAudience: string;
  coreMessage: string;
  // Step 2: Style
  ebookStyle: EbookStyle | null;
  // Step 3: Format
  accentColor: string;
  // Step 4: Source
  sourceText: string;
  sourceFiles: ProjectSource[];
  // Step 5: Generate
  generating: boolean;
  error: string;

  setStep: (step: WizardStep) => void;
  setField: (field: "title" | "author" | "targetAudience" | "coreMessage" | "sourceText", value: string) => void;
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
  coreMessage: "",
  ebookStyle: null as EbookStyle | null,
  accentColor: "#6366f1",
  sourceText: "",
  sourceFiles: [],
  generating: false,
  error: "",
};

export const useProjectWizardStore = create<WizardState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step, error: "" }),
  setField: (field, value) => set({ [field]: value, error: "" }),
  setSourceFiles: (sourceFiles) => set({
    sourceFiles,
    sourceText: sourceFiles.map((source) => source.content).join("\n\n"),
    error: "",
  }),
  setEbookStyle: (ebookStyle) => set({ ebookStyle, error: "" }),
  setAccentColor: (accentColor) => set({ accentColor }),
  setGenerating: (generating) => set({ generating }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
