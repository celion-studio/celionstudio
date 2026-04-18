import { create } from "zustand";

type WizardState = {
  step: 1 | 2 | 3;
  pastedText: string;
  files: File[];
  targetAudience: string;
  goal: string;
  depth: string;
  tone: string;
  structureStyle: string;
  readerLevel: string;
  error: string;
  setStep: (step: 1 | 2 | 3) => void;
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
  setError: (value: string) => void;
  reset: () => void;
};

const initialState = {
  step: 1 as const,
  pastedText: "",
  files: [] as File[],
  targetAudience: "",
  goal: "",
  depth: "Standard",
  tone: "Expert",
  structureStyle: "Step-by-step",
  readerLevel: "Practitioner",
  error: "",
};

export const useGuideWizardStore = create<WizardState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step, error: "" }),
  setPastedText: (pastedText) => set({ pastedText, error: "" }),
  setFiles: (files) => set({ files, error: "" }),
  setField: (field, value) => set({ [field]: value, error: "" }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
