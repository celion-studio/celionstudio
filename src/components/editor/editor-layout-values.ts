export function formatLayoutNumber(value: number) {
  const rounded = Math.round(value);
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

export function clampLayoutNumber(value: number, min?: number, max?: number) {
  let nextValue = value;
  if (typeof min === "number") nextValue = Math.max(min, nextValue);
  if (typeof max === "number") nextValue = Math.min(max, nextValue);
  return nextValue;
}

export function parseTranslate(transform: string | undefined) {
  if (!transform || transform === "none") return { x: 0, y: 0 };

  const matrix3dMatch = transform.match(/^matrix3d\(([^)]+)\)$/);
  if (matrix3dMatch) {
    const values = matrix3dMatch[1]!.split(",").map((part) => Number(part.trim()));
    return {
      x: Number.isFinite(values[12]) ? values[12]! : 0,
      y: Number.isFinite(values[13]) ? values[13]! : 0,
    };
  }

  const matrixMatch = transform.match(/^matrix\(([^)]+)\)$/);
  if (matrixMatch) {
    const values = matrixMatch[1]!.split(",").map((part) => Number(part.trim()));
    return {
      x: Number.isFinite(values[4]) ? values[4]! : 0,
      y: Number.isFinite(values[5]) ? values[5]! : 0,
    };
  }

  const translateMatch = transform.match(/translate(?:3d)?\(([^)]+)\)/);
  if (!translateMatch) return { x: 0, y: 0 };

  const [rawX = "0", rawY = "0"] = translateMatch[1]!.split(",");
  return {
    x: Number.parseFloat(rawX) || 0,
    y: Number.parseFloat(rawY) || 0,
  };
}

export function layoutNumber(value: string | undefined, fallback: number, min?: number, max?: number) {
  const parsed = Number(value);
  return clampLayoutNumber(Number.isFinite(parsed) ? parsed : fallback, min, max);
}
