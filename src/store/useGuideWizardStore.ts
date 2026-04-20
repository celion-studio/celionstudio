import { create } from "zustand";

type WizardState = {
  step: 1 | 2 | 3 | 4;
  title: string;
  pastedText: string;
  files: File[];
  targetAudience: string;
  goal: string;
  depth: string;
  tone: string;
  structureStyle: string;
  readerLevel: string;
  outline: string[];
  outlineStyleKey: string;
  error: string;
  setStep: (step: 1 | 2 | 3 | 4) => void;
  setTitle: (value: string) => void;
  setPastedText: (value: string) => void;
  setFiles: (value: File[]) => void;
  setField: (
    field:
      | "targetAudience"
      | "goal"
      | "depth"
      | "tone"
      | "structureStyle"
      | "readerLevel",
    value: string,
  ) => void;
  setOutline: (outline: string[]) => void;
  setGeneratedOutline: (outline: string[], styleKey: string) => void;
  setError: (value: string) => void;
  reset: () => void;
};

const initialState = {
  step: 1 as const,
  title: "",
  pastedText: "",
  files: [] as File[],
  targetAudience: "",
  goal: "",
  depth: "",
  tone: "",
  structureStyle: "",
  readerLevel: "",
  outline: [] as string[],
  outlineStyleKey: "",
  error: "",
};

export const useGuideWizardStore = create<WizardState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step, error: "" }),
  setTitle: (title) => set({ title, error: "" }),
  setPastedText: (pastedText) => set({ pastedText, error: "" }),
  setFiles: (files) => set({ files, error: "" }),
  setField: (field, value) => set({ [field]: value, error: "" }),
  setOutline: (outline) => set({ outline, error: "" }),
  setGeneratedOutline: (outline, outlineStyleKey) =>
    set({ outline, outlineStyleKey, error: "" }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
