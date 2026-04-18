# Tech Spec — Digital Product Builder

작성일: 2026-04-14
버전: v0.1
문서 목적: PRD, MVP Scope, Wireframe을 바탕으로 첫 버전 구현을 위한 기술 아키텍처와 데이터/AI 흐름을 정의한다.

## 1. 문서 범위
이 문서는 MVP 첫 릴리스를 위한 기술적 기준 문서다.
포함 범위:
- 권장 기술 스택
- 시스템 아키텍처
- 핵심 도메인 모델
- AI 생성 파이프라인
- API 초안
- 저장 구조
- PDF export 방식
- 인증/운영 기본 방침

제외 범위:
- ManyChat 직접 연동
- 결제 시스템 상세 설계
- 팀 협업 설계
- 고급 분석 인프라

---

## 2. 제품 기술 목표
1. 사용자가 10분 안에 첫 결과물을 보도록 응답 흐름을 단순화한다
2. 새로 쓰기와 기존 콘텐츠 재가공을 동일한 파이프라인에 태운다
3. 구조 생성 → 본문 생성 → 배포 패키지 생성 단계를 분리해 재시도와 저장이 쉽도록 만든다
4. PDF export를 안정적으로 제공하되, 디자인 커스터마이징은 최소화한다
5. 복잡한 외부 연동보다 내부 생성 흐름의 완성도를 우선한다

---

## 3. 권장 기술 스택

### 3.1 Frontend
추천:
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui 또는 Radix 기반 컴포넌트
- React Hook Form + Zod

선정 이유:
- 빠른 MVP 구축
- 서버 액션/API 라우트와의 결합이 좋음
- 대시보드 + 편집기 + export 흐름 구현이 쉬움

### 3.2 Backend
추천:
- Next.js Route Handlers 또는 별도 Node.js API
- TypeScript
- Prisma ORM

MVP 판단:
초기에는 Next.js 단일 리포 구조가 적합하다.
프론트/백 분리보다 한 저장소에서 빠르게 구축하는 편이 유리하다.

### 3.3 Database
추천:
- PostgreSQL
- Prisma

이유:
- 구조화된 프로젝트/챕터/생성 결과 저장에 적합
- 확장성 좋음
- SaaS MVP 표준 선택지

### 3.4 Auth
추천:
- NextAuth/Auth.js 또는 Clerk

MVP 추천:
Clerk를 쓰면 속도는 빠르지만 비용/의존성이 생긴다.
Auth.js + email magic link 또는 Google login 조합이 무난하다.

### 3.5 AI Layer
추천:
- LLM provider abstraction 레이어 1개 두기
- OpenAI API 또는 OpenRouter 기반
- 서버 측에서 prompt orchestration 관리

이유:
- 나중에 모델 교체 가능
- 단계별 prompt 관리 용이
- usage logging과 retry 처리 가능

### 3.6 PDF Export
추천:
- HTML 템플릿 + headless browser 기반 PDF 생성
- 선택지: Playwright 또는 Puppeteer

이유:
- 초기엔 가장 안정적
- React/HTML 렌더링 자산 재사용 가능
- 템플릿 기반 PDF 생성이 쉬움

### 3.7 Hosting / Infra
추천:
- Vercel (frontend + server routes)
- Supabase 또는 managed Postgres
- Blob storage는 Supabase Storage 또는 S3 호환 스토리지

---

## 4. 시스템 아키텍처 개요

```text
[Client / Next.js UI]
        |
        v
[App Server / API Layer]
        |
        +--> [Auth]
        +--> [Project Service]
        +--> [AI Generation Service]
        +--> [Export Service]
        +--> [Asset Copy Service]
        |
        v
[PostgreSQL]
        |
        +--> [Object Storage for exported PDFs]
```

핵심 원칙:
- UI는 workflow 중심
- 서버는 step-based orchestration 중심
- AI 호출은 서비스 계층에서만 관리
- 생성 결과는 중간 단계마다 저장

---

## 5. 핵심 사용자 흐름과 시스템 단계 매핑

### 5.1 Brief Setup
입력:
- productType
- generationMode
- topic
- audience
- goal
- tone
- length
- sourceText

처리:
- project 생성
- brief 저장
- sourceText 정규화

출력:
- projectId
- brief state saved

### 5.2 Structure Builder
입력:
- projectId
- brief
- sourceText(optional)

처리:
- 제목 후보 생성
- 부제 후보 생성
- 목차안 생성
- promise sentence 생성

출력:
- titleCandidates
- subtitleCandidates
- tocCandidates
- positioningSummary

### 5.3 Draft Editor
입력:
- selected structure
- brief
- sourceText(optional)

처리:
- 서문 생성
- 챕터별 본문 생성
- 요약/체크리스트 생성
- CTA 생성

출력:
- draft sections
- chapter blocks
- CTA block

### 5.4 Distribution Pack
입력:
- final or edited draft
- brief
- positioning summary

처리:
- 소개문 생성
- 랜딩 문구 생성
- SNS 홍보 문구 생성
- 댓글 유도 문구 생성
- DM 문구 생성

출력:
- distribution assets

### 5.5 Export
입력:
- approved draft content
- export template

처리:
- HTML render
- PDF generation
- storage upload

출력:
- file url
- export metadata

---

## 6. 도메인 모델

### 6.1 Project
하나의 디지털상품 작업 단위

필드 초안:
- id
- user_id
- title
- slug
- product_type
- generation_mode
- status
- created_at
- updated_at

status 후보:
- draft
- structure_ready
- content_ready
- distribution_ready
- exported

### 6.2 ProductBrief
상품 방향 정의 데이터

필드:
- id
- project_id
- topic
- target_audience
- goal
- tone
- length_preference
- source_text
- source_summary

### 6.3 StructureOption
AI가 생성한 구조 후보

필드:
- id
- project_id
- option_index
- title
- subtitle
- promise_statement
- toc_json
- is_selected

### 6.4 Chapter
선택된 구조 기반 챕터 데이터

필드:
- id
- project_id
- sort_order
- title
- summary
- chapter_type

chapter_type 후보:
- intro
- chapter
- summary
- cta
n
### 6.5 DraftBlock
실제 본문 블록

필드:
- id
- project_id
- chapter_id
- content_markdown
- content_html
- generation_version
- edited_by_user
- updated_at

### 6.6 DistributionAsset
배포용 카피 자산

필드:
- id
- project_id
- asset_type
- content
- generation_version
- updated_at

asset_type 후보:
- product_description
- landing_short
- social_post
- comment_hook
- dm_message
- email_optin

### 6.7 ExportJob
파일 출력 이력

필드:
- id
- project_id
- export_type
- status
- file_url
- created_at
- completed_at

export_type 후보:
- pdf
- txt

---

## 7. 권장 DB 스키마 개요

```text
users
projects
product_briefs
structure_options
chapters
draft_blocks
distribution_assets
export_jobs
llm_generations
```

### 7.1 llm_generations 테이블 권장
이유:
- 어떤 프롬프트/단계에서 생성되었는지 추적 가능
- 디버깅, 비용 파악, 품질 개선에 중요

필드:
- id
- project_id
- stage
- provider
- model
- prompt_version
- input_snapshot_json
- output_snapshot_json
- latency_ms
- token_in
- token_out
- created_at

stage 후보:
- structure
- draft_intro
- draft_chapter
- summary
- cta
- distribution_pack

---

## 8. AI 생성 파이프라인

핵심 원칙:
한 번에 모든 결과를 거대한 프롬프트로 만들지 않는다.
단계를 나눠 저장하고 재시도 가능하게 한다.

### 8.1 Pipeline A — Structure Generation
입력:
- brief
- source summary(optional)

출력:
- titleCandidates[5]
- subtitleCandidates[3]
- tocOptions[3]
- promiseStatement

실패 처리:
- empty response면 1회 자동 재시도
- invalid JSON이면 repair step 수행

### 8.2 Pipeline B — Draft Generation
입력:
- selected structure
- brief
- source_text(optional)

권장 방식:
- 서문 1회 생성
- 챕터별 개별 생성
- 요약/CTA 별도 생성

이유:
- 챕터 단위 재생성이 쉬움
- 긴 응답 오류 줄어듦
- 비용/품질 제어 가능

### 8.3 Pipeline C — Distribution Pack
입력:
- brief
- draft summary
- CTA

출력:
- 소개문
- 랜딩 짧은 설명
- SNS 3안
- 댓글 유도 3안
- DM 문구

### 8.4 Prompt 관리 원칙
- stage별 prompt template 파일 분리
- hard-coded string 난립 방지
- prompt version을 저장해 결과 품질 비교 가능하게

권장 폴더:
```text
src/prompts/
  structure.ts
  draft-intro.ts
  draft-chapter.ts
  summary.ts
  cta.ts
  distribution.ts
```

---

## 9. API 초안

### POST /api/projects
역할:
프로젝트 생성

request:
- title(optional)
- productType
- generationMode

response:
- projectId

### POST /api/projects/:id/brief
역할:
브리프 저장

request:
- topic
- targetAudience
- goal
- tone
- length
- sourceText

### POST /api/projects/:id/generate-structure
역할:
제목/목차/포지셔닝 생성

response:
- structureOptions[]
- positioningSummary

### POST /api/projects/:id/select-structure
역할:
구조 선택 저장

request:
- structureOptionId 또는 custom structure payload

### POST /api/projects/:id/generate-draft
역할:
본문 초안 생성

response:
- chapters[]
- draftBlocks[]

### PATCH /api/projects/:id/chapters/:chapterId
역할:
챕터 직접 수정 저장

### POST /api/projects/:id/chapters/:chapterId/regenerate
역할:
특정 챕터 재생성

### POST /api/projects/:id/generate-distribution
역할:
배포 패키지 생성

response:
- distributionAssets[]

### POST /api/projects/:id/export/pdf
역할:
PDF export 생성

response:
- exportJobId
- fileUrl(optional async complete 후)

### GET /api/projects/:id
역할:
프로젝트 상세 조회

### GET /api/projects
역할:
최근 프로젝트 목록 조회

---

## 10. 프론트엔드 상태 관리

MVP 권장:
- server state: React Query 또는 Next fetch/cache 전략
- form state: React Hook Form
- editor local state: component local state + debounced save

중요 포인트:
- 긴 문서를 전역 상태로 무리하게 들고 가지 않는다
- 챕터 단위 저장을 기본으로 한다

필수 상태:
- currentProject
- briefForm
- selectedStructure
- draftBlocks
- distributionAssets
- autosaveStatus
- generationStatusByStage

---

## 11. PDF export 구현 방식

### 권장 구현
1. draft_blocks를 HTML template에 주입
2. server-side에서 인쇄용 HTML 렌더
3. Playwright/Puppeteer로 PDF 생성
4. storage 업로드
5. file URL 반환

### PDF MVP 요구사항
- 표지 제목
- 부제
- 챕터 제목/본문
- 요약 섹션
- CTA 섹션
- 기본적인 typography 유지

제외:
- 자유형 레이아웃 편집
- 복잡한 그래픽 편집
- 대규모 디자인 테마 엔진

---

## 12. 저장 전략

원칙:
- 단계별 저장
- 자동 저장 기본
- 긴 생성 결과는 즉시 DB 저장

권장 방식:
- Brief 저장: step 완료 시
- Structure 저장: 생성 직후 + 선택 시
- Draft 저장: 챕터별 생성 직후, 편집 시 debounce 저장
- Distribution assets 저장: 생성 직후

---

## 13. 에러 처리 원칙

### 사용자-facing 에러 메시지
- “구조 생성에 실패했습니다. 다시 시도해주세요.”
- “본문 생성 중 일부 챕터가 실패했습니다. 실패한 챕터만 다시 생성할 수 있습니다.”
- “PDF 내보내기에 실패했습니다. 잠시 후 다시 시도해주세요.”

### 시스템 측면
- LLM timeout retry 1~2회
- invalid JSON repair 시도
- export 실패 시 job status 추적
- 생성 단계별 로그 남기기

---

## 14. 보안 및 권한

MVP 최소 기준:
- 모든 프로젝트는 user_id 단위 접근 제한
- export 파일 URL은 비공개 또는 서명 URL 권장
- source_text는 사용자 자산이므로 안전하게 저장
- 프롬프트/응답 로그에서 민감한 원문 노출 최소화 고려

---

## 15. 관측 가능성 / 운영

최소한 아래는 저장 또는 모니터링 권장:
- stage별 LLM 호출 성공/실패율
- 평균 생성 시간
- PDF export 성공률
- project 생성 → export 도달 전환율
- 가장 많이 재생성되는 단계

로그 권장 이벤트:
- project_created
- brief_saved
- structure_generated
- structure_selected
- draft_generated
- chapter_regenerated
- distribution_generated
- export_started
- export_completed
- export_failed

---

## 16. 초기 폴더 구조 제안

```text
app/
  dashboard/
  projects/[id]/brief/
  projects/[id]/structure/
  projects/[id]/draft/
  projects/[id]/distribution/
  api/

src/
  components/
  features/
    projects/
    brief/
    structure/
    draft/
    distribution/
    export/
  lib/
    db/
    auth/
    llm/
    pdf/
  prompts/
  schemas/
  services/

prisma/
  schema.prisma
```

---

## 17. MVP 기술 의사결정 요약
- Monorepo-like single Next.js app으로 시작
- PostgreSQL + Prisma 사용
- 단계별 AI generation service 분리
- HTML to PDF export 채택
- 복잡한 자동화 연동은 제외
- 텍스트 붙여넣기 기반의 콘텐츠 입력부터 검증

---

## 18. 오픈 기술 이슈
1. LLM structured output을 JSON schema로 얼마나 강하게 강제할 것인가
2. draft_blocks를 markdown 중심으로 저장할지 html 중심으로 저장할지
3. PDF 템플릿을 1개로 시작할지 2~3개 variation을 둘지
4. source_text 길이가 긴 경우 chunking 전략을 어떻게 둘지
5. 생성 비용과 응답속도 균형을 어떤 모델 조합으로 맞출지

권장 초기 판단:
- structured output 강제
- markdown 저장 + html 파생 생성
- PDF 템플릿 1개부터
- 긴 source_text는 server-side summarize 후 단계 입력
- 구조 생성과 카피 생성은 중간급 모델, 본문은 더 강한 모델 고려

---

## 19. 다음 단계
1. Prisma schema 초안 작성
2. API contract를 OpenAPI 또는 route doc 형태로 세분화
3. Prompt spec 문서 작성
4. Build plan에 따라 구현 순서 확정
