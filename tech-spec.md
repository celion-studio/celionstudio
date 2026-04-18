# Tech Spec — Celion v1

작성일: 2026-04-19  
버전: v0.2  
문서 목적: PRD와 현재 Celion v1 제품 방향을 기준으로, 실제 구현에 사용할 기술 스택과 시스템 구조를 확정한다.

## 1. 문서 범위

이 문서는 Celion v1의 첫 실서비스 구현을 위한 기술 기준 문서다.

포함 범위:
- 최종 기술 스택 결정
- 인증/세션 전략
- 데이터베이스 및 ORM 구조
- 핵심 도메인 모델
- AI 생성 및 수정 파이프라인
- PDF export / Figma handoff 방향
- API 초안
- 보안 / 운영 / 저장 전략

제외 범위:
- 결제 시스템 상세 설계
- 팀 협업 / 권한 레벨 설계
- 고급 분석 대시보드
- ManyChat, 이메일 자동화, 배포 자동화 직접 연동
- 고급 비주얼 에디터

---

## 2. 제품 기술 목표

1. 사용자가 자신의 소스 자료를 넣고 10분 안에 첫 HTML 가이드 결과물을 볼 수 있어야 한다.
2. Celion은 blank-page editor가 아니라 source-first builder로 동작해야 한다.
3. HTML 결과물은 preview, revision, PDF export, Figma handoff의 공통 기준 포맷이어야 한다.
4. 인증과 저장 구조는 초기 프로토타입 수준이 아니라 실제 사용자 계정 기반으로 설계한다.
5. v1은 기능 폭보다 흐름 완성도를 우선한다.

---

## 3. 최종 기술 스택

### 3.1 Frontend

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- Zustand
- Zod

선정 이유:
- 현재 코드베이스와 자연스럽게 이어진다.
- App Router 기반으로 API route, server component, client component 구분이 명확하다.
- Builder / Dashboard / Wizard 구조를 한 저장소에서 빠르게 유지할 수 있다.

### 3.2 Backend

- Next.js Route Handlers
- TypeScript
- Better Auth
- Drizzle ORM

선정 이유:
- 별도 백엔드 없이도 MVP를 빠르게 운영 가능하다.
- 인증, 세션, API, DB 접근을 동일한 앱 경계 안에서 관리할 수 있다.
- Celion v1 규모에서는 별도 API 서버 분리보다 단일 애플리케이션 구조가 유리하다.

### 3.3 Database

- Neon Postgres
- Drizzle ORM
- `@neondatabase/serverless`

선정 이유:
- Postgres 기반으로 확장성과 운영 안정성이 좋다.
- Neon은 Vercel/Next.js 환경과 궁합이 좋고 serverless 배포에 적합하다.
- Drizzle은 타입 안정성이 높고 Better Auth의 Drizzle adapter와 잘 맞는다.

기본 드라이버 선택:
- 런타임 DB 연결: `drizzle-orm/neon-http`
- 마이그레이션/스키마 관리: `drizzle-kit`

### 3.4 Authentication

- Better Auth
- Email / Password 로그인
- Google OAuth 로그인

선정 이유:
- 소셜 로그인과 기본 계정 인증을 같은 프레임워크 안에서 일관되게 관리할 수 있다.
- Next.js와의 통합이 단순하다.
- Drizzle adapter를 통해 Neon Postgres와 자연스럽게 연결할 수 있다.

### 3.5 AI Layer

- Google GenAI SDK (`@google/genai`) 또는 동등한 provider abstraction
- 서버 측 prompt orchestration
- 단계별 generation 기록 저장

원칙:
- outline과 full HTML generation을 분리한다.
- revision도 별도 run으로 저장한다.
- source text를 그대로 버리지 않고 normalized corpus를 기준 입력으로 사용한다.

### 3.6 File Extraction / Export

- PDF text extraction: `pdfjs-dist`
- DOCX extraction: `mammoth`
- PDF export: Playwright

선정 이유:
- Celion의 본질은 source extraction + HTML generation + PDF export 흐름이다.
- export는 브라우저 인쇄가 아니라 서버 측 렌더를 목표로 한다.

### 3.7 Hosting / Infra

- Vercel
- Neon Postgres
- 향후 파일 저장소: Vercel Blob 또는 S3-compatible storage

v1 판단:
- HTML은 DB에 저장 가능하다.
- PDF binary는 장기적으로 object storage에 저장하는 편이 맞다.
- 초기에는 export 결과를 직접 스트리밍해도 되지만, 운영 기준으로는 storage 저장이 권장된다.

---

## 4. 핵심 아키텍처

```text
[Browser / Next.js UI]
        |
        v
[Next.js App Router]
        |
        +--> [Better Auth Route + Session]
        +--> [Guide API]
        +--> [Source Extraction Service]
        +--> [AI Generation Service]
        +--> [Revision Service]
        +--> [PDF Export Service]
        +--> [Figma Handoff Service]
        |
        v
[Drizzle ORM]
        |
        v
[Neon Postgres]
```

핵심 원칙:
- 앱은 `Landing / Dashboard / Builder` 세 개의 top-level surface만 가진다.
- 서버는 인증, 저장, AI orchestration, export를 책임진다.
- HTML은 하나의 canonical output이다.
- Revision은 현재 HTML snapshot을 입력으로 새 HTML snapshot을 만드는 방식이다.

---

## 5. 인증 전략

### 5.1 인증 스택

Celion v1은 Better Auth를 사용한다.

기본 활성화 범위:
- email/password sign up
- email/password sign in
- Google OAuth sign in
- 세션 기반 인증

초기 비활성 범위:
- magic link
- passkey
- 2FA
- organizations

위 기능은 v1 이후 확장 포인트로 남긴다.

### 5.2 Better Auth 구성 원칙

- `BETTER_AUTH_SECRET`와 `BETTER_AUTH_URL`를 환경변수로 관리한다.
- `src/lib/auth.ts`에 Better Auth 서버 설정을 둔다.
- `src/lib/auth-client.ts`에 클라이언트 helper를 둔다.
- Next.js route handler는 `/api/auth/[...all]` 경로를 사용한다.
- DB adapter는 Drizzle adapter + Postgres provider를 사용한다.

### 5.3 Google OAuth 구성

필수 환경변수:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

로컬 redirect URI:
- `http://localhost:3000/api/auth/callback/google`

운영 redirect URI:
- `https://<production-domain>/api/auth/callback/google`

주의:
- `BETTER_AUTH_URL`이 정확하지 않으면 `redirect_uri_mismatch`가 발생한다.
- local, preview, production URL을 혼동하지 않도록 환경별 값을 분리해야 한다.

### 5.4 세션 정책

- 기본 인증 방식은 Better Auth session cookie 기반으로 간다.
- 모든 guide/project 데이터는 authenticated user 기준으로만 접근한다.
- API route에서 user session 검증을 통과하지 못하면 데이터 조회/수정을 막는다.

---

## 6. 데이터 모델

Celion v1 데이터 모델은 Better Auth 기본 테이블 + Celion 도메인 테이블로 나뉜다.

### 6.1 Better Auth 테이블

Better Auth + Drizzle adapter가 관리하는 기본 테이블:
- `user`
- `session`
- `account`
- `verification`

필요 시 project conventions에 맞춰 plural table naming을 선택할 수 있지만, 초기에는 Better Auth 기본 naming을 우선한다.

### 6.2 Celion 도메인 테이블

#### guides

하나의 가이드 작업 단위.

필드:
- `id`
- `userId`
- `title`
- `status`
- `currentHtmlVersionId`
- `createdAt`
- `updatedAt`

status 후보:
- `draft`
- `processing_sources`
- `generating`
- `ready`
- `revising`
- `exported`

#### source_items

하나의 pasted/uploaded source.

필드:
- `id`
- `guideId`
- `sourceType`
- `originalFilename`
- `rawText`
- `normalizedText`
- `createdAt`

sourceType 후보:
- `pasted_text`
- `pdf`
- `md`
- `txt`
- `docx`

#### guide_profiles

가이드 shaping 설정.

필드:
- `guideId`
- `targetAudience`
- `goal`
- `depth`
- `tone`
- `structureStyle`
- `readerLevel`
- `createdAt`
- `updatedAt`

#### html_versions

전체 HTML snapshot 저장.

필드:
- `id`
- `guideId`
- `html`
- `versionNumber`
- `createdByRunId`
- `createdAt`

#### ai_runs

AI generation / revision 요청 로그.

필드:
- `id`
- `guideId`
- `runType`
- `status`
- `prompt`
- `targetSection`
- `inputMeta`
- `outputMeta`
- `model`
- `latencyMs`
- `createdAt`

runType 후보:
- `outline_generation`
- `html_generation`
- `full_revision`
- `section_revision`

#### export_jobs

PDF export 기록.

필드:
- `id`
- `guideId`
- `htmlVersionId`
- `status`
- `fileUrl`
- `createdAt`
- `completedAt`

---

## 7. Drizzle / Neon 설계

### 7.1 기본 원칙

- schema는 `src/lib/db/schema.ts`에 둔다.
- DB client는 `src/lib/db/index.ts` 또는 `src/lib/db/client.ts`에 둔다.
- Drizzle config는 루트 `drizzle.config.ts`에 둔다.
- `DATABASE_URL`은 Neon connection string을 사용한다.

### 7.2 런타임 연결

Next.js 서버 런타임에서는 Neon HTTP 드라이버를 사용한다.

권장 형태:

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql });
```

이 선택 이유:
- serverless 환경에서 single query / 일반 CRUD에 적합하다.
- Celion v1은 긴 interactive transaction보다 짧은 DB 호출이 많다.

### 7.3 마이그레이션

- 스키마 변경은 Drizzle schema 기준으로 관리한다.
- 마이그레이션 생성: `npx drizzle-kit generate`
- 마이그레이션 반영: `npx drizzle-kit migrate`

Better Auth 관련 스키마는:
1. `auth.ts` 설정 작성
2. Better Auth CLI로 schema 반영
3. Drizzle migration과 정합성 확인

원칙:
- auth 테이블과 Celion 도메인 테이블을 같은 Postgres DB 안에서 관리한다.
- 운영 중에는 로컬 mock storage가 아니라 DB를 canonical storage로 본다.

---

## 8. 소스 처리 파이프라인

### 8.1 입력 소스

허용 입력:
- pasted text
- PDF
- MD
- TXT
- DOCX

비허용 입력:
- HWP / HWPX

### 8.2 처리 단계

1. 입력 파일/텍스트 수집
2. 파일 타입별 텍스트 추출
3. trim / normalization
4. 빈 입력 / 너무 얇은 입력 검증
5. source corpus 구성
6. guide 생성 단계로 전달

### 8.3 normalization 원칙

- 여러 소스를 하나의 corpus로 병합한다.
- obvious duplication은 제거 가능하게 설계한다.
- 사용자 문체와 핵심 표현을 최대한 유지한다.
- placeholder 텍스트로 대체하지 않는다.

---

## 9. AI 생성 파이프라인

Celion v1은 최소 2단계 생성 구조를 가진다.

### 9.1 Pipeline A — Outline / Structure Generation

입력:
- normalized source corpus
- target audience
- goal
- tone
- structure style
- reader level
- depth

출력:
- title
- subtitle 또는 positioning summary
- section structure
- generation metadata

### 9.2 Pipeline B — Full HTML Generation

입력:
- approved outline
- profile summary
- normalized source corpus

출력:
- 전체 HTML 문서
- stable `data-section` markers 포함

핵심 원칙:
- JSON block editor 모델로 저장하지 않는다.
- HTML 문서를 canonical output으로 저장한다.

### 9.3 Pipeline C — Revision

패턴:
- whole-draft revision
- section-targeted revision

입력:
- current html
- revision prompt
- optional target section

출력:
- 새로운 html snapshot

### 9.4 에러 처리

- LLM timeout은 제한된 횟수로 재시도한다.
- invalid structured output은 repair path를 둔다.
- 실패한 run은 `ai_runs`에 남긴다.
- UI는 “전체 실패”와 “특정 단계 실패”를 구분해서 보여준다.

---

## 10. HTML 결과물 원칙

Celion v1은 full HTML output을 저장한다.

필수 조건:
- semantic section 사용
- section마다 stable `data-section` marker 포함
- preview, export, handoff에 동일 HTML 사용
- 사용자 입력은 HTML escaping 또는 sanitization 경로를 거쳐야 함

예시:

```html
<section data-section="hero">...</section>
<section data-section="intro">...</section>
<section data-section="lesson-1">...</section>
```

주의:
- preview에 `srcDoc`를 쓸 경우 XSS 방어와 sandbox 전략이 필요하다.
- export 전 HTML sanitization 또는 trusted render pipeline이 필요하다.

---

## 11. API 초안

### 11.1 Auth

Better Auth route:
- `GET/POST /api/auth/[...all]`

앱 내부에서 직접 구현하지 않고 Better Auth handler에 위임한다.

### 11.2 Guide APIs

- `POST /api/guides`
  - guide 생성
- `GET /api/guides`
  - 내 guide 목록 조회
- `GET /api/guides/:id`
  - 단일 guide 조회
- `POST /api/guides/:id/sources`
  - source 업로드/등록
- `POST /api/guides/:id/generate/outline`
  - outline 생성
- `POST /api/guides/:id/generate/html`
  - full HTML 생성
- `POST /api/guides/:id/revise`
  - whole draft 또는 section revision
- `POST /api/guides/:id/export/pdf`
  - PDF export
- `POST /api/guides/:id/handoff/figma`
  - Figma handoff payload 생성

권한 원칙:
- 모든 guide API는 authenticated user 기준으로 `guide.userId === session.user.id`를 검사해야 한다.

---

## 12. PDF Export / Figma Handoff

### 12.1 PDF Export

권장 구현:
1. current HTML snapshot 조회
2. 서버 측 인쇄용 페이지 렌더
3. Playwright로 PDF 생성
4. binary 응답 또는 storage 업로드
5. `export_jobs` 기록 저장

v1 요구사항:
- 현재 HTML 버전을 기준으로 출력
- layout 안정성 우선
- 디자인 variation보다 일관성을 우선

### 12.2 Figma Handoff

v1 목표:
- 현재 HTML을 handoff payload로 제공
- 추후 Figma 연동의 입력 기준을 마련

원칙:
- Celion은 디자인 툴이 아니다.
- Figma handoff는 “더 높은 수준의 polish 작업”을 위한 연결점이다.

---

## 13. 프론트엔드 상태 관리

### 13.1 Local UI State

- Wizard step state: Zustand
- temporary form state: component local state + Zod validation
- builder action feedback: component local state

### 13.2 Server State

- guides list
- guide detail
- current html version
- export job state
- session state

권장 방향:
- 인증과 guide 데이터는 서버 canonical state로 다룬다.
- localStorage는 더 이상 기본 저장소가 아니다.
- optimistic update는 제한적으로만 사용한다.

---

## 14. 보안 원칙

### 14.1 인증 / 권한

- 모든 guide는 user ownership을 가진다.
- unauthenticated 상태에서는 guide 생성/수정/조회 불가.
- session cookie는 운영에서 secure cookie를 사용한다.

### 14.2 사용자 입력

- source text는 신뢰하지 않는다.
- HTML generation 전후로 sanitization/escaping 경로를 분명히 둔다.
- preview iframe에는 sandbox 정책을 검토한다.

### 14.3 민감 정보

- `BETTER_AUTH_SECRET`, `DATABASE_URL`, `GOOGLE_CLIENT_SECRET`는 절대 클라이언트로 노출하지 않는다.
- AI run 로그에는 원문 전문을 무제한 저장하지 않도록 주의한다.

---

## 15. 운영 / 관측 가능성

최소 추적 이벤트:
- `auth_signup_completed`
- `auth_signin_completed`
- `guide_created`
- `sources_uploaded`
- `outline_generated`
- `html_generated`
- `revision_requested`
- `revision_completed`
- `export_started`
- `export_completed`
- `export_failed`

핵심 운영 지표:
- signup → first guide creation 전환율
- guide creation → first HTML generation 전환율
- HTML generation 평균 시간
- PDF export 성공률
- 가장 많이 실패하는 source type

---

## 16. 환경변수

필수:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GEMINI_API_KEY`

예시:

```env
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GEMINI_API_KEY=
```

---

## 17. 권장 폴더 구조

```text
src/
  app/
    (marketing)/
    dashboard/
    builder/[guideId]/
    api/
      auth/[...all]/
      guides/
  components/
    marketing/
    dashboard/
    wizard/
    builder/
  lib/
    auth.ts
    auth-client.ts
    db/
      index.ts
      schema.ts
    ai/
    file-extract/
    pdf/
    figma/
    validators/
  store/
  types/
  styles/

drizzle/
  migrations/

drizzle.config.ts
```

---

## 18. 구현 우선순위

### Phase 1

- Neon + Drizzle 연결
- Better Auth 기본 세팅
- Email/Password 로그인
- Google OAuth 로그인
- user session 확인

### Phase 2

- guide / source / profile / html version 스키마
- guide CRUD API
- dashboard를 DB 기반으로 전환

### Phase 3

- source extraction
- outline generation
- full HTML generation
- builder를 DB + auth 기반으로 전환

### Phase 4

- revision pipeline
- PDF export
- Figma handoff
- observability / hardening

---

## 19. 최종 기술 의사결정 요약

- 앱 구조: single Next.js app
- 인증: Better Auth
- 로그인 방식: Email/Password + Google OAuth
- DB: Neon Postgres
- ORM: Drizzle ORM
- 런타임 드라이버: Neon HTTP
- 결과물 canonical format: full HTML
- export: Playwright 기반 PDF
- 저장 전략: DB 중심, localStorage 보조 또는 제거

---

## 20. 현재 기준 오픈 이슈

1. Better Auth 기본 테이블 naming을 그대로 사용할지, project naming convention으로 조정할지
2. AI source normalization에서 deduplication 강도를 어디까지 둘지
3. HTML sanitization 전략을 generation 직후에 둘지, preview/export 직전에 둘지
4. PDF export 결과를 즉시 다운로드로 끝낼지, storage URL로 저장할지
5. Google 외 추가 social login을 v1에 넣을지 후순위로 둘지

---

## 21. 다음 단계

1. `package.json`에 Better Auth / Drizzle / Neon 의존성 추가
2. `drizzle.config.ts` 및 `src/lib/db/schema.ts` 작성
3. `src/lib/auth.ts`, `src/lib/auth-client.ts`, `/api/auth/[...all]` 추가
4. Better Auth + Drizzle schema generation 및 migration 적용
5. 기존 localStorage 기반 guide 흐름을 DB 기반으로 전환
