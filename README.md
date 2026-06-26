# 회생ON — 개인회생·파산 AI 실무 플랫폼

개인회생·파산 업무 전 과정(상담 → 신청 → 보정 → 개시/선고 → 변제/면책)을
AI로 빠르고 정확하게 처리하는 **실무자용 구독형 SaaS** 프로토타입입니다.
law-bot.kr의 "거래내역 분석" 같은 핵심 기능을 포함하되, 보정명령 처리·서류작성·일정관리까지 업무 전반으로 확장했습니다.

## 실행

```bash
cd hoesaeng-ai
npm install
npm run dev       # http://localhost:3000
```

> AI 키 없이도 모든 기능이 **규칙기반**으로 동작합니다.
> 품질을 높이려면 `.env.local`에 `ANTHROPIC_API_KEY`를 설정하세요(`.env.example` 참고).

## 핵심 기능

| 메뉴 | 설명 |
|------|------|
| **대시보드** | 진행 사건·임박 기한(D-day)·보정 진행률을 한눈에 |
| **사건 관리** | 의뢰인별 개인회생/파산 사건, 단계 타임라인, 채권자·재산, 변제계획 자동 추정, AI 절차 진단 |
| **의뢰인** | 연락처·진행 사건·카톡 연동 관리 |
| **보정명령(AI)** | 보정명령 원문 → 항목별 자동 분해 → 의뢰인용 안내문 자동 생성 → **카톡·이메일·문자 공유** → 보정서(답변서) 초안 |
| **AI 서류작성** | 신청서·채권자목록·재산목록·수입지출·변제계획안·진술서 자동 작성 |
| **거래내역 분석** | 은행/카드/증권·코인 → 기준금액 추출·본인계좌 자동매칭·특정인 거래(부분일치)·대출금 사용처 소명표·마이너스 통장 추적·카드 현금서비스 탐지·엑셀(CSV) 다운로드 (law-bot.kr 핵심기능 반영) |
| **일정·기한** | 보정기한·기일·변제납입 캘린더, 카톡/이메일 알림 |
| **변제 계산기** | 청산가치·가용소득·변제율 즉시 계산(기준 중위소득 설정값 반영) |
| **설정·구독** | 요금제(Free/Pro/Team), 사무소 정보, 기준값, 채널 연동 |

## 아키텍처

- **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4**
- 데이터 계층: `lib/store.tsx` (현재 localStorage 기반 → 추후 Supabase/Postgres 교체 지점이 분리되어 있음)
- AI: `lib/ai.ts`(Anthropic 래퍼) + 규칙기반 폴백(`lib/corrections.ts`, `lib/docgen.ts`, `lib/txn.ts`)
- 도메인 로직: `lib/calc.ts`(청산가치·가용소득·변제계획·적합성)

```
app/(app)/*          화면(대시보드·사건·보정·서류·분석·일정·계산기·PDF도구·설정)
app/api/ai/*         AI 라우트(보정 분석·서류 작성)
app/api/billing/*    토스 정기결제(빌링키 발급·승인)
app/api/notify       카카오 알림톡·SMS 발송(솔라피)
app/api/integrations/status   연동 상태
lib/                 계산·보정/서류/거래내역·PDF·OCR·결제·알림·Supabase
supabase/schema.sql  멀티 사무소 DB 스키마(RLS)
```

## 연동(.env.local — 전부 선택, 미설정 시 로컬·규칙기반/목으로 동작)

| 기능 | 키 | 비고 |
|------|----|------|
| AI 품질 향상 | `ANTHROPIC_API_KEY` | 미설정 시 규칙기반 폴백 |
| DB·인증·멀티사무소 | `NEXT_PUBLIC_SUPABASE_URL`, `..._ANON_KEY` | 스키마 `supabase/schema.sql` |
| 정기결제 | `TOSS_SECRET_KEY`, `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 테스트 키 가능 |
| 카카오 알림톡 | `SOLAPI_API_KEY/SECRET/SENDER` (+`PF_ID`,`TEMPLATE_ID`) | 미설정 시 발송 mock |

## 구현 완료 (PDF·OCR·연동)

- **거래내역 PDF/이미지 자동 추출** — `pdfjs-dist` 텍스트 PDF, `tesseract.js`(kor+eng) 스캔/이미지 OCR → 거래내역 파서 연결
- **기준금액 하이라이트 PDF** — `pdf-lib`로 기준금액 이상 거래 색칠(출금 빨강/입금 파랑·통합 노랑) PDF 다운로드
- **PDF 도구모음**(`/tools`) — 회전·병합·분할·페이지삭제·PDF→이미지·이미지→PDF (전부 브라우저 로컬 처리)
- **통합 레이어** — Supabase 스키마·클라이언트, 토스 빌링 결제 라우트+카드등록 UI, 카카오 알림톡 발송(공유 다이얼로그 연동), 설정의 실시간 연동 상태

## 남은 단계

1. **데이터 계층 Supabase 실전 전환** — `lib/store.tsx`(localStorage) → Supabase 리포지토리, auth 로그인/회원가입
2. **문서 출력** — HWP/PDF 양식 매핑, 전자제출 연계
3. **알림톡 템플릿 승인** — 카카오 비즈채널 발신프로필·템플릿 등록, 일정 D-day 자동발송 스케줄러
4. **은행별 PDF 파서 고도화** — 주요 은행/카드사 포맷별 정밀 추출(증권·코인 대조 포함)

---
※ 본 프로토타입의 계산·문서·분석은 실무 참고용이며, 최종 판단은 담당자의 검토가 필요합니다.
