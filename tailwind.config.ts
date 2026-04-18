import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-subtle": "var(--color-surface-subtle)",
        muted: "var(--color-muted)",
        text: "var(--color-text)",
        accent: "var(--color-accent)",
        accentSoft: "var(--color-accent-soft)",
        line: "var(--color-line)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        float: "0 4px 24px rgba(31, 31, 31, 0.08)",
      },
      borderRadius: {
        panel: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
