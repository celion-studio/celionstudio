import { spawnSync } from "node:child_process";
import process from "node:process";

const testFiles = [
  "src/lib/ai/json.test.ts",
  "src/lib/ai/gemini.test.ts",
  "src/components/editor/export-cleanup.test.ts",
  "src/components/editor/editor-layout-chrome.test.ts",
  "src/components/editor/editor-preview.test.ts",
  "src/components/editor/editor-document-edits.test.ts",
  "src/components/editor/editor-preview-frame.test.ts",
  "src/components/wizard/wizard-flow.test.tsx",
  "src/lib/source-ingestion.test.ts",
  "src/lib/ebook-html.test.ts",
  "src/lib/ebook-save.test.ts",
  "src/lib/ebook-document.test.ts",
  "src/lib/ebook-generation.test.ts",
  "src/lib/billing.test.ts",
  "src/lib/projects.test.ts",
  "src/lib/db/index.test.ts",
  "src/lib/db/schema.test.ts",
  "src/lib/storage/r2.test.ts",
  "scripts/init-db.test.ts",
] as const;

for (const file of testFiles) {
  const result = spawnSync(process.execPath, ["--import", "tsx", file], {
    stdio: "inherit",
  });

  if (result.signal) {
    console.error(`Test interrupted by ${result.signal}: ${file}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
