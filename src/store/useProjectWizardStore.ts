import { create } from "zustand";
import {
  DEFAULT_CUSTOM_PAGE_SIZE,
  DEFAULT_PAGE_FORMAT,
  type PageFormat,
  type PageSize,
} from "@/lib/page-format";

export type WizardStep = 1 | 2 | 3 | 4;

export type WizardTone =
  | "preserve"
  | "clear"
  | "practical"
  | "editorial"
  | "friendly";

type WizardState = {
  step: WizardStep;
  title: string;
  author: string;
  targetAudience: string;
  coreMessage: string;
  tone: WizardTone;
  files: File[];
  pageFormat: PageFormat;
  customPageSize: PageSize;
  generating: boolean;
  error: string;

  setStep: (step: WizardStep) => void;
  setField: (
    field: "title" | "author" | "targetAudience" | "coreMessage",
    value: string,
  ) => void;
  setTone: (tone: WizardTone) => void;
  setFiles: (value: File[]) => void;
  setPageFormat: (pageFormat: PageFormat, customPageSize: PageSize) => void;
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
  tone: "preserve" as WizardTone,
  files: [] as File[],
  pageFormat: DEFAULT_PAGE_FORMAT,
  customPageSize: DEFAULT_CUSTOM_PAGE_SIZE,
  generating: false,
  error: "",
};

export const useProjectWizardStore = create<WizardState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step, error: "" }),
  setField: (field, value) => set({ [field]: value, error: "" }),
  setTone: (tone) => set({ tone, error: "" }),
  setFiles: (files) => set({ files, error: "" }),
  setPageFormat: (pageFormat, customPageSize) =>
    set({ pageFormat, customPageSize, error: "" }),
  setGenerating: (generating) => set({ generating }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
