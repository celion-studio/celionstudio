import { create } from "zustand";
import type { EbookOutline, EbookStyle } from "@/types/project";

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

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
  pageCount: number;
  accentColor: string;
  // Step 4: Source
  sourceText: string;
  // Step 5: Outline
  outline: EbookOutline | null;
  outlineLoading: boolean;
  // Step 6: Generate
  generating: boolean;
  error: string;

  setStep: (step: WizardStep) => void;
  setField: (field: "title" | "author" | "targetAudience" | "coreMessage" | "sourceText", value: string) => void;
  setEbookStyle: (style: EbookStyle) => void;
  setPageCount: (count: number) => void;
  setAccentColor: (color: string) => void;
  setOutline: (outline: EbookOutline | null) => void;
  setOutlineLoading: (loading: boolean) => void;
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
  pageCount: 16,
  accentColor: "#6366f1",
  sourceText: "",
  outline: null as EbookOutline | null,
  outlineLoading: false,
  generating: false,
  error: "",
};

export const useProjectWizardStore = create<WizardState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step, error: "" }),
  setField: (field, value) => set({ [field]: value, error: "" }),
  setEbookStyle: (ebookStyle) => set({ ebookStyle, error: "" }),
  setPageCount: (pageCount) => set({ pageCount }),
  setAccentColor: (accentColor) => set({ accentColor }),
  setOutline: (outline) => set({ outline }),
  setOutlineLoading: (outlineLoading) => set({ outlineLoading }),
  setGenerating: (generating) => set({ generating }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
