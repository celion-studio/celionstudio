import type { GuideRecord } from "@/types/guide";

const STORAGE_KEY = "celion.guides";

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

export function getGuides() {
  if (!canUseStorage()) {
    return [] as GuideRecord[];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [] as GuideRecord[];
  }

  try {
    const guides = JSON.parse(raw) as GuideRecord[];
    return Array.isArray(guides) ? guides : [];
  } catch {
    return [] as GuideRecord[];
  }
}

export function getGuideById(guideId: string) {
  return getGuides().find((guide) => guide.id === guideId) ?? null;
}

export function saveGuide(nextGuide: GuideRecord) {
  if (!canUseStorage()) {
    return nextGuide;
  }

  const guides = getGuides();
  const existingIndex = guides.findIndex((guide) => guide.id === nextGuide.id);

  if (existingIndex === -1) {
    guides.unshift(nextGuide);
  } else {
    guides[existingIndex] = nextGuide;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(guides));
  return nextGuide;
}
