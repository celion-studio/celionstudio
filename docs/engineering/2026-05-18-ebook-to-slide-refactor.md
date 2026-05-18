# 2026-05-18 ebook → slide 전환 리팩토링 상태

## 개요
Celion의 내부 용어/타입/함수명을 `ebook` 중심에서 `slide` 중심으로 전면 전환하는 작업.

## 완료된 항목

### 1. 슬라이드 포맷 지원 (완료)
- `src/lib/slide-format.ts`: `CelionSlideFormat` 타입, `SLIDE_FORMATS` 맵 (A5: 559×794, 16:9: 1280×720)
- `src/lib/slide-document.ts`: `CelionSlideDocument`에 `format` 필드 추가, `normalizeSlideDocument`에서 size 기반 자동 감지
- `src/components/editor/EditorShell.tsx`: `document.format` 기반 동적 캔버스 크기
- `src/lib/slide-generation.ts`: Gemini 프롬프트가 선택된 포맷의 정확한 치수 전달
- `src/lib/slide-generate-request.ts`: API request schema에 `slideFormat` 필드 추가
- `src/store/useProjectWizardStore.ts`: Wizard 상태에 `slideFormat` 추가
- `src/components/wizard/BasicsStep.tsx`: 슬라이드 포맷 선택 드롭다운 UI
- `src/components/wizard/WizardContent.tsx`: 포맷 상태를 API 페이로드에 포함

### 2. 파일명 변경 (완료)
| 이전 | 이후 |
|---|---|
| `ebook-format.ts` | `slide-format.ts` |
| `ebook-document.ts` | `slide-document.ts` |
| `ebook-html.ts` | `slide-html.ts` |
| `ebook-style.ts` | `slide-style.ts` |
| `ebook-generation.ts` | `slide-generation.ts` |
| `ebook-generate-request.ts` | `slide-generate-request.ts` |
| `ebook-generation-logs.ts` | `slide-generation-logs.ts` |
| `ebook-save.ts` | `slide-save.ts` |

### 3. 타입명 변경 (완료)
| 이전 | 이후 |
|---|---|
| `CelionEbookDocument` | `CelionSlideDocument` |
| `EbookStyle` | `SlideStyle` |
| `EbookGenerationArgs` | `SlideGenerationArgs` |
| `EbookPlan` | `SlidePlan` |
| `EbookPlanSlide` | `SlidePlanSlide` |
| `EbookGenerationDiagnostics` | `SlideGenerationDiagnostics` |
| `EbookGenerationBatchTrace` | `SlideGenerationBatchTrace` |
| `EbookGenerationError` | `SlideGenerationError` |
| `EbookGenerateRequestBody` | `SlideGenerateRequestBody` |
| `EbookGenerationLogInput` | `SlideGenerationLogInput` |

### 4. 함수명 변경 (완료)
| 이전 | 이후 |
|---|---|
| `normalizeEbookDocument` | `normalizeSlideDocument` |
| `normalizeStoredEbookDocument` | `normalizeStoredSlideDocument` |
| `compileEbookDocumentToHtml` | `compileSlideDocumentToHtml` |
| `validateEbookDocument` | `validateSlideDocument` |
| `sanitizeEbookDocument` | `sanitizeSlideDocument` |
| `generateEbookHtml` | `generateSlideHtml` |
| `generateEbookPlan` | `generateSlidePlan` |
| `generateEbookHtmlFromPlan` | `generateSlideHtmlFromPlan` |
| `generateEbookHtmlWithDiagnostics` | `generateSlideHtmlWithDiagnostics` |
| `getEbookGenerationArgs` | `getSlideGenerationArgs` |
| `parseEbookGenerateRequest` | `parseSlideGenerateRequest` |
| `recordEbookGenerationLog` | `recordSlideGenerationLog` |

### 5. ProjectProfile 필드명 (완료)
| 이전 | 이후 |
|---|---|
| `ebookStyle` | `slideStyle` |
| `ebookHtml` | `slideHtml` |
| `ebookDocument` | `slideDocument` |
| `ebookPageCount` | `slideCount` |

### 6. Wizard UI 카피 (일부 완료)
- STEP_TITLES, STEP_DESCRIPTIONS 업데이트
- "Generate ebook" → "Generate slides"

## 남은 작업 (173개 타입 에러)

### A. API 라우트 디렉토리명 변경
- `src/app/api/ebook/` → `src/app/api/slide/`
  - `plan/route.ts`
  - `generate/route.ts`
  - `save/route.ts`
- 내부 import 경로도 함께 수정 필요

### B. API 라우트 파일 내부 수정
- `src/app/api/ebook/generate/route.ts`:
  - `EbookGenerationLogInput` → `SlideGenerationLogInput` (import)
  - `diagnostics.ebookDocument` → `diagnostics.slideDocument`
  - `getEbookPageCountForHtml` → `getSlideCountForHtml` (함수명 확인)
  - `d.ebookStyle` → `d.slideStyle` (request body)
  - `ebookStyle` 필드를 `slideStyle`로 로그에 전달

- `src/app/api/ebook/plan/route.ts`:
  - import 경로 확인
  - `d.ebookStyle` → `d.slideStyle`

- `src/app/api/ebook/save/route.ts`:
  - import 경로 확인
  - `ebookStyle`/`ebookHtml`/`ebookDocument` 참조 수정

### C. 테스트 파일 전체 수정 (가장 많음)
- `src/lib/ebook-document.test.ts` → `src/lib/slide-document.test.ts`
  - `CelionEbookDocument` → `CelionSlideDocument`
  - `format: "a5_portrait"` 누락된 fixture들
  - `validateEbookDocument` → `validateSlideDocument`
  - `sanitizeEbookDocument` → `sanitizeSlideDocument`
  - `compileEbookDocumentToHtml` → `compileSlideDocumentToHtml`

- `src/lib/ebook-generation.test.ts` → `src/lib/slide-generation.test.ts`
  - `diagnostics.ebookDocument` → `diagnostics.slideDocument`
  - `generateEbookHtml` → `generateSlideHtml`
  - `generateEbookHtmlWithDiagnostics` → `generateSlideHtmlWithDiagnostics`
  - `generateEbookHtmlFromPlan` → `generateSlideHtmlFromPlan`
  - `EbookGenerationError` → `SlideGenerationError`
  - `ebookStyle: "minimal"` → `slideStyle: "minimal"`

- `src/lib/ebook-html.test.ts` → `src/lib/slide-html.test.ts`
  - import 경로 수정
  - `parseEbookGenerateRequest` → `parseSlideGenerateRequest`
  - `ebookStyle` → `slideStyle`

- `src/lib/ebook-save.test.ts` → `src/lib/slide-save.test.ts`
  - import 경로 수정
  - `CelionEbookDocument` → `CelionSlideDocument`

- `src/lib/projects.test.ts`
  - `ebookDocument` → `slideDocument`
  - `ebookStyle` → `slideStyle`

- `src/components/editor/editor-document-edits.test.ts`
  - `CelionEbookDocument` → `CelionSlideDocument`
  - `format: "a5_portrait"` 추가
  - import 경로 수정

- `src/components/editor/editor-preview.test.ts`
  - `CelionEbookDocument` → `CelionSlideDocument`
  - `format: "a5_portrait"` 추가

- `src/components/editor/editor-layout-chrome.test.ts`
  - import 경로 수정

- `src/components/wizard/wizard-flow.test.tsx`
  - import 경로 수정
  - `ebookStyle` → `slideStyle`

### D. 에디터 컴포넌트
- `src/components/editor/editor-shell-panels.tsx`:
  - import 경로 수정 (`@/lib/slide-document` 등)

- `src/components/editor/editor-document-edits.ts`:
  - import 경로 수정
  - `CelionSlideDocument` 타입 확인

- `src/components/editor/editor-preview.ts`:
  - import 경로 수정

- `src/components/editor/editor-preview-selection.ts`:
  - import 경로 수정

- `src/components/editor/editor-types.ts`:
  - import 경로 수정

- `src/components/editor/use-editor-export.ts`:
  - import 경로 수정
  - `compileSlideDocumentToHtml` 확인

- `src/components/editor/use-editor-save.ts`:
  - import 경로 수정
  - `normalizeSlideDocument`, `compileSlideDocumentToHtml` 등

- `src/components/editor/use-editor-undo.ts`:
  - import 경로 수정

- `src/components/editor/use-editor-selection.ts`:
  - import 경로 수정

- `src/components/editor/inspector-controls.tsx`:
  - import 경로 수정

- `src/components/editor/editor-layout-chrome.ts`:
  - import 경로 수정

### E. Wizard 컴포넌트
- `src/components/wizard/StyleStep.tsx`:
  - `EBOOK_STYLE_OPTIONS` → `SLIDE_STYLE_OPTIONS` (export명 확인)
  - `EbookStyle` → `SlideStyle`
  - `ebookStyle` prop → `slideStyle`

- `src/components/wizard/GenerateStepEbook.tsx`:
  - `EBOOK_STYLE_LABELS` → `SLIDE_STYLE_LABELS`
  - `EbookStyle` → `SlideStyle`
  - `ebookStyle` prop → `slideStyle`
  - UI 카피: "A5 ebook" → "A5 slides" 등

- `src/components/wizard/SourceStepEbook.tsx`:
  - `ebook-source-upload` ID → `slide-source-upload`
  - 파일명도 `SourceStepSlide.tsx`로 변경 고려

- `src/components/wizard/PlanStepEbook.tsx`:
  - 파일명 `PlanStepSlide.tsx`로 변경 고려
  - import 경로 확인

### F. 대시보드/페이지
- `src/app/editor/[projectId]/page.tsx`:
  - import 경로 수정
  - `project.profile.slideHtml`, `project.profile.slideDocument` 확인

- `src/app/api/projects/route.ts`:
  - `ebookStyle` → `slideStyle`
  - `ebookDocument` → `slideDocument`

- `src/app/api/projects/[projectId]/generation-logs/route.ts`:
  - import 경로 수정

- `src/components/dashboard/DashboardHome.tsx`:
  - UI 카피: "Start an ebook" → "Start a slide" 등

- `src/components/dashboard/DashboardShell.tsx`:
  - UI 카피 수정

- `src/components/dashboard/SettingsPanel.tsx`:
  - UI 카피 수정

- `src/app/pricing/page.tsx`:
  - UI 카피: "ebooks" → "slides" 등

### G. DB 마이그레이션 (별도 작업)
- `project_profiles` 테이블이 현재 DB에 없음 (실제 테이블명 확인 필요)
- 실제 테이블 확인 후:
  - `ebook_document` → `slide_document`
  - `ebook_html` → `slide_html`
  - `ebook_style` → `slide_style`
  - `ebook_page_count` → `slide_count`
  - `ebook_generation_logs` → `slide_generation_logs`
- `src/lib/db/schema.ts`의 `applyAppSchema`도 함께 수정

### H. 문서
- `tech-spec.md`: ebook → slide 용어 업데이트
- `design.md`: 관련 용어 업데이트
- `docs/superpowers/plans/2026-05-01-page-level-ebook-document.md`: 아카이브 또는 업데이트

## 작업 우선순위 추천

1. **API 라우트 디렉토리명 변경** (`/api/ebook/` → `/api/slide/`)
2. **API 라우트 파일 내부 타입 에러 수정** (generate, plan, save route)
3. **에디터 컴포넌트 import 경로 수정** (editor-shell-panels, editor-document-edits, editor-preview 등)
4. **Wizard 컴포넌트 prop명 수정** (StyleStep, GenerateStepEbook)
5. **테스트 파일 전체 수정** (가장 많지만 영향도 낮음)
6. **대시보드/페이지 UI 카피 수정**
7. **DB 마이그레이션** (Neon branch에서 별도 진행)
8. **문서 업데이트**

## 현재 타입 에러 분포
- API 라우트: ~15개
- 에디터 컴포넌트/테스트: ~80개
- Wizard 컴포넌트/테스트: ~30개
- 대시보드/페이지: ~20개
- 프로젝트/DB 관련: ~28개

## 참고
- `src/lib/slide-style.ts`의 `EBOOK_STYLE_OPTIONS`, `EBOOK_STYLE_LABELS` export명도 `SLIDE_STYLE_*`로 변경 필요
- `src/lib/slide-html.ts`의 `SLIDE_SIZE_PX`는 기본값이 A5임. 16:9 선택 시 동적으로 바꿔야 함
- Wizard에서 선택한 `slideFormat`이 API → generation → document 저장까지 연결되어 있는지 확인 필요
