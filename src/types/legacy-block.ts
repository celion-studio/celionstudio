export type LegacyBlock = {
  id?: string;
  type?: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: LegacyBlock[];
  [key: string]: unknown;
};
