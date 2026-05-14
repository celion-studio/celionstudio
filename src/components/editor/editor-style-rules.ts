export const LAYOUT_PROPS = new Set(["transform", "width", "height"]);

export function cssPropertyName(prop: string) {
  return prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function layoutMarker(pageId: string, elementId: string) {
  const safePageId = pageId.replace(/\*\//g, "").trim();
  const safeElementId = elementId.replace(/\*\//g, "").trim();
  return {
    start: `/* celion-layout:${safePageId}:${safeElementId} */`,
    end: `/* /celion-layout:${safePageId}:${safeElementId} */`,
  };
}

export function styleMarker(pageId: string, elementId: string) {
  const safePageId = pageId.replace(/\*\//g, "").trim();
  const safeElementId = elementId.replace(/\*\//g, "").trim();
  return {
    start: `/* celion-style:${safePageId}:${safeElementId} */`,
    end: `/* /celion-style:${safePageId}:${safeElementId} */`,
  };
}

export function parseDeclarations(value: string) {
  const declarations = new Map<string, string>();
  value.split(";").forEach((part) => {
    const [rawProp, ...rawValueParts] = part.split(":");
    const prop = rawProp?.trim();
    const declarationValue = rawValueParts.join(":").trim();
    if (!prop || !declarationValue) return;
    declarations.set(prop, declarationValue);
  });

  return declarations;
}

export function formatDeclarations(declarations: Map<string, string>) {
  return Array.from(declarations)
    .map(([prop, value]) => `${prop}: ${value};`)
    .join(" ");
}

function compactCss(css: string) {
  return css
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function removeExistingScopedRules(input: {
  css: string;
  selector: string;
  markers: { start: string; end: string };
  shouldCollectProp?: (prop: string) => boolean;
  shouldRemoveLegacyRule?: (props: string[]) => boolean;
}) {
  const declarations = new Map<string, string>();
  let nextCss = input.css;
  const collectProp = input.shouldCollectProp ?? (() => true);
  const removeLegacyRule = input.shouldRemoveLegacyRule ?? (() => true);

  const markerPattern = new RegExp(`\\s*${escapeRegex(input.markers.start)}\\s*\\n?${escapeRegex(input.selector)}\\s*\\{([^{}]*)\\}\\s*\\n?${escapeRegex(input.markers.end)}\\s*`, "g");
  nextCss = nextCss.replace(markerPattern, (_match, rawDeclarations: string) => {
    parseDeclarations(rawDeclarations).forEach((value, prop) => {
      if (collectProp(prop)) declarations.set(prop, value);
    });
    return "\n";
  });

  const legacyRulePattern = new RegExp(`(^|\\n)\\s*${escapeRegex(input.selector)}\\s*\\{([^{}]*)\\}\\s*(?=\\n|$)`, "g");
  nextCss = nextCss.replace(legacyRulePattern, (match, prefix: string, rawDeclarations: string) => {
    const parsed = parseDeclarations(rawDeclarations);
    const props = Array.from(parsed.keys());
    if (!removeLegacyRule(props)) return match;

    parsed.forEach((value, prop) => {
      if (collectProp(prop)) declarations.set(prop, value);
    });
    return prefix;
  });

  return {
    css: compactCss(nextCss),
    declarations,
  };
}
