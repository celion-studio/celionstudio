# Build Plan — Digital Product Builder MVP

작성일: 2026-04-14
버전: v0.1
문서 목적: MVP를 실제 구현 가능한 단계로 나눈 실행 계획 문서

# Digital Product Builder MVP Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 크리에이터/전문가가 주제 또는 기존 콘텐츠를 입력하면 전자책/PDF 가이드 초안과 배포 패키지를 생성하고 PDF로 내보낼 수 있는 MVP를 구축한다.

**Architecture:** Next.js 단일 앱 구조 위에 PostgreSQL + Prisma를 두고, 브리프 → 구조 → 본문 → 배포 패키지 → export의 단계형 파이프라인으로 구현한다. AI 생성은 stage별 서비스 함수로 분리하고, 결과는 중간 단계마다 저장한다.

**Tech Stack:** Next.js, TypeScript, Tailwind, Prisma, PostgreSQL, Auth.js, OpenAI/OpenRouter API, Playwright/Puppeteer

---

## 1. 구현 원칙
- P0만 구현한다
- “발행 준비 완료” 경험이 나오기 전까지 부가 기능은 넣지 않는다
- 거대한 올인원 생성보다 단계형 생성과 저장을 우선한다
- 사용자는 10분 안에 첫 결과물을 봐야 한다
- 챕터 단위 재생성을 기본 UX로 한다

## 2. 산출물 범위
첫 릴리스에서 동작해야 하는 것:
- 계정 로그인
- 프로젝트 생성
- 브리프 입력/저장
- 구조 생성
- 구조 선택/간단 수정
- 본문 생성
- 기본 편집
- 배포 패키지 생성
- PDF export
- 프로젝트 재진입

---

## 3. 단계별 구현 계획

### Phase 0 — Foundation
목표:
개발 가능한 최소 기반을 세팅한다.

산출물:
- Next.js 앱 초기화
- TypeScript / Tailwind / UI base 세팅
- Prisma + PostgreSQL 연결
- Auth 기본 세팅
- 기본 라우트 및 레이아웃

완료 기준:
- 로그인 후 대시보드 진입 가능
- DB 연결 확인 가능
- 기본 프로젝트 리스트 페이지 렌더 가능

### Phase 1 — Project and Brief
목표:
프로젝트 생성과 브리프 저장 흐름 구현

산출물:
- 프로젝트 생성 API
- 브리프 입력 화면
- 브리프 저장 API
- 최근 프로젝트 목록

완료 기준:
- 사용자가 새 프로젝트를 만들고 brief를 저장할 수 있음
- 저장 후 프로젝트를 다시 열어 brief를 볼 수 있음

### Phase 2 — Structure Generation
목표:
제목/부제/목차 제안과 구조 선택 흐름 구현

산출물:
- structure prompt 템플릿
- 구조 생성 API
- structure options 저장
- 구조 선택 UI
- 선택 구조 저장

완료 기준:
- 사용자가 3개 안 이상 구조 제안을 볼 수 있음
- 그 중 하나를 선택/수정하고 다음 단계로 갈 수 있음

### Phase 3 — Draft Generation
목표:
서문/챕터/요약/CTA 생성 및 편집

산출물:
- intro prompt
- chapter prompt
- summary/cta prompt
- draft generation API
- 챕터별 draft block 저장
- 편집 UI
- 챕터 재생성 API

완료 기준:
- 선택 구조 기준으로 초안이 생성됨
- 챕터 단위 수정/재생성이 가능함

### Phase 4 — Distribution Pack
목표:
배포용 카피를 생성하고 저장

산출물:
- distribution prompt
- distribution asset API
- 소개문 / 랜딩 문구 / SNS / 댓글 / DM 생성 UI

완료 기준:
- 사용자가 배포 자산을 보고 복사할 수 있음

### Phase 5 — PDF Export
목표:
문서를 PDF와 텍스트로 내보내기

산출물:
- print HTML template
- PDF 생성 서비스
- export job 저장
- export 버튼 및 다운로드 링크

완료 기준:
- 사용자가 생성한 결과물을 PDF로 다운로드할 수 있음

### Phase 6 — Polish and Release Readiness
목표:
MVP를 실제 테스트 가능한 수준으로 다듬기

산출물:
- 에러 핸들링
- loading state
- autosave UX
- 기본 이벤트 로깅
- empty state / retry flow

완료 기준:
- end-to-end 흐름에서 막힘이 적음
- 실패 시 재시도 메시지가 적절함

---

## 4. 구현 우선순위 상세 작업

### Task 1: 프로젝트 초기 앱 구조 생성
**Objective:** MVP 앱의 기본 개발 환경을 준비한다.

**Files:**
- Create: `package.json`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `src/components/`
- Create: `prisma/schema.prisma`

**검증:**
- 개발 서버 실행
- 루트 페이지 렌더 확인

### Task 2: DB 스키마 초안 작성
**Objective:** 프로젝트/브리프/구조/드래프트/배포/익스포트 저장을 위한 스키마를 정의한다.

**Files:**
- Modify: `prisma/schema.prisma`

**핵심 모델:**
- User
- Project
- ProductBrief
- StructureOption
- Chapter
- DraftBlock
- DistributionAsset
- ExportJob
- LLMGeneration

**검증:**
- Prisma migration 성공
- 테이블 생성 확인

### Task 3: 인증 도입
**Objective:** 사용자별 프로젝트 분리를 위한 최소 인증을 구현한다.

**Files:**
- Create: `src/lib/auth/`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Modify: `app/layout.tsx`

**검증:**
- 로그인/로그아웃 가능
- 비로그인 상태에서 보호 라우트 차단

### Task 4: 대시보드 구현
**Objective:** 최근 프로젝트와 새 프로젝트 시작점을 제공한다.

**Files:**
- Create: `app/dashboard/page.tsx`
- Create: `src/features/projects/components/project-list.tsx`
- Create: `src/features/projects/components/new-project-cta.tsx`

**검증:**
- 빈 상태/프로젝트 목록 상태 렌더
- 새 프로젝트 버튼 동작

### Task 5: 프로젝트 생성 API 구현
**Objective:** 새 작업 단위를 만들 수 있게 한다.

**Files:**
- Create: `app/api/projects/route.ts`
- Create: `src/services/project-service.ts`
- Create: `src/schemas/project.ts`

**검증:**
- POST 요청 시 project row 생성
- 생성 후 해당 프로젝트 화면 이동 가능

### Task 6: 브리프 입력 화면 구현
**Objective:** 주제, 타겟, 목적, 톤, 분량, sourceText를 입력받는다.

**Files:**
- Create: `app/projects/[id]/brief/page.tsx`
- Create: `src/features/brief/components/brief-form.tsx`
- Create: `src/schemas/brief.ts`

**검증:**
- 폼 입력 가능
- validation 동작

### Task 7: 브리프 저장 API 구현
**Objective:** 브리프를 DB에 저장한다.

**Files:**
- Create: `app/api/projects/[id]/brief/route.ts`
- Create: `src/services/brief-service.ts`

**검증:**
- 저장 후 새로고침 시 값 유지

### Task 8: 구조 생성 프롬프트와 서비스 구현
**Objective:** 제목/부제/목차/상품 약속 문장을 생성한다.

**Files:**
- Create: `src/prompts/structure.ts`
- Create: `src/lib/llm/client.ts`
- Create: `src/services/structure-generation-service.ts`
- Create: `app/api/projects/[id]/generate-structure/route.ts`

**검증:**
- 구조 후보 3안 이상 반환
- 생성 로그 저장

### Task 9: 구조 선택 UI 구현
**Objective:** 사용자가 후보 중 하나를 선택하고 가볍게 수정할 수 있게 한다.

**Files:**
- Create: `app/projects/[id]/structure/page.tsx`
- Create: `src/features/structure/components/structure-option-card.tsx`
- Create: `src/features/structure/components/structure-editor.tsx`
- Create: `app/api/projects/[id]/select-structure/route.ts`

**검증:**
- 구조 선택 후 저장 가능
- 선택 결과가 다음 단계에서 반영됨

### Task 10: 드래프트 생성 서비스 구현
**Objective:** 서문, 챕터, 요약, CTA를 단계적으로 생성한다.

**Files:**
- Create: `src/prompts/draft-intro.ts`
- Create: `src/prompts/draft-chapter.ts`
- Create: `src/prompts/summary.ts`
- Create: `src/prompts/cta.ts`
- Create: `src/services/draft-generation-service.ts`
- Create: `app/api/projects/[id]/generate-draft/route.ts`

**검증:**
- 초안 생성 후 draft_blocks 저장
- intro/chapter/summary/cta가 모두 생김

### Task 11: 드래프트 편집 화면 구현
**Objective:** 챕터 단위 편집 및 재생성을 지원한다.

**Files:**
- Create: `app/projects/[id]/draft/page.tsx`
- Create: `src/features/draft/components/chapter-sidebar.tsx`
- Create: `src/features/draft/components/draft-editor.tsx`
- Create: `app/api/projects/[id]/chapters/[chapterId]/route.ts`
- Create: `app/api/projects/[id]/chapters/[chapterId]/regenerate/route.ts`

**검증:**
- 텍스트 수정 저장
- 챕터 재생성 동작
- autosave status 표시

### Task 12: 배포 패키지 생성 구현
**Objective:** 소개문/랜딩 문구/SNS/댓글/DM 문구를 생성한다.

**Files:**
- Create: `src/prompts/distribution.ts`
- Create: `src/services/distribution-service.ts`
- Create: `app/api/projects/[id]/generate-distribution/route.ts`
- Create: `app/projects/[id]/distribution/page.tsx`

**검증:**
- 배포 자산 저장
- 항목별 복사 가능 UI 제공

### Task 13: PDF export 구현
**Objective:** 생성 결과를 PDF로 내보낸다.

**Files:**
- Create: `src/lib/pdf/render-project-html.ts`
- Create: `src/lib/pdf/generate-pdf.ts`
- Create: `app/api/projects/[id]/export/pdf/route.ts`
- Create: `src/features/export/components/export-modal.tsx`

**검증:**
- PDF 생성 성공
- 다운로드 링크 반환

### Task 14: 최근 프로젝트와 재진입 강화
**Objective:** 저장한 작업을 다시 열고 이어서 진행하게 한다.

**Files:**
- Modify: `app/dashboard/page.tsx`
- Create: `app/projects/[id]/page.tsx`

**검증:**
- 최근 프로젝트에서 각 단계로 복귀 가능

### Task 15: 예외 처리 및 기본 품질 개선
**Objective:** MVP를 실제 테스트 가능한 수준으로 안정화한다.

**Files:**
- Modify: generation/export 관련 화면 및 API 전반

**검증:**
- 실패 시 사용자 메시지 출력
- retry 버튼 제공
- 최소 logging 동작

---

## 5. 테스트 및 검증 전략

### 단위 검증
- schema validation 테스트
- service 함수 테스트
- prompt response parsing 테스트

### 통합 검증
- 프로젝트 생성 → 브리프 저장 → 구조 생성
- 구조 선택 → 드래프트 생성
- 드래프트 수정 → 배포 패키지 생성
- PDF export 생성

### 수동 시나리오 테스트
1. 새 주제로 상품 만들기
2. 기존 콘텐츠 붙여넣기로 상품 만들기
3. 챕터 재생성 후 export
4. 중간 저장 후 재진입

---

## 6. 파일/폴더 제안 구조

```text
app/
  dashboard/page.tsx
  projects/[id]/brief/page.tsx
  projects/[id]/structure/page.tsx
  projects/[id]/draft/page.tsx
  projects/[id]/distribution/page.tsx
  api/
    projects/

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
    auth/
    db/
    llm/
    pdf/
  prompts/
  schemas/
  services/

prisma/
  schema.prisma
```

---

## 7. 마일스톤

### Milestone 1
브리프 저장까지 완료

### Milestone 2
구조 생성 및 선택 완료

### Milestone 3
본문 생성 및 편집 완료

### Milestone 4
배포 패키지 생성 완료

### Milestone 5
PDF export 완료

### Milestone 6
MVP end-to-end 테스트 완료

---

## 8. 리스크와 대응

### 리스크 1: LLM 출력 형식 불안정
대응:
- structured output 강제
- parse/repair 유틸 추가

### 리스크 2: 긴 본문 생성 시 품질 저하
대응:
- 챕터 단위 생성
- source_text 요약 후 주입

### 리스크 3: PDF 품질이 기대보다 낮음
대응:
- 템플릿 1개를 안정화하는 데 집중
- 디자인보다 가독성 우선

### 리스크 4: 범위가 계속 커짐
대응:
- ManyChat, 결제, 팀 기능은 문서상으로만 두고 구현 제외
- P0 외 기능은 브랜치조차 만들지 않기

---

## 9. 출시 체크리스트
- [ ] 로그인 가능
- [ ] 새 프로젝트 생성 가능
- [ ] 브리프 저장 가능
- [ ] 구조 생성 가능
- [ ] 구조 선택 가능
- [ ] 드래프트 생성 가능
- [ ] 챕터 수정/재생성 가능
- [ ] 배포 패키지 생성 가능
- [ ] PDF export 가능
- [ ] 저장 후 재진입 가능

---

## 10. 실행 후 다음 단계
이 계획을 바탕으로 다음 문서를 만들면 좋다.
1. `prisma-schema.md` 또는 실제 `schema.prisma`
2. `api-spec.md`
3. `prompt-spec.md`
4. `implementation-todos.md`
