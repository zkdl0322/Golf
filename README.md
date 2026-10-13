# ⛳ 골프 레슨 예약 앱

지점 선택 → 소속 프로 명단 → 레슨 상품(10/20/30회) 구매 → 빈 시간·타석 확인 후 예약하는 앱입니다.

- **Next.js 16** (App Router, Server Actions) + **Tailwind CSS**
- **Supabase** (Postgres DB, 카카오 로그인)

## 바로 실행해보기 (데모 모드)

```bash
npm install
npm run dev
```

http://localhost:3000 을 열면 됩니다. Supabase 설정이 없으면 샘플 데이터(`src/lib/mock-data.ts`)로 동작하고,
로그인 없이 구매·예약·취소를 해볼 수 있습니다. (서버를 재시작하면 내역이 초기화됩니다)

## Supabase 연결하기

1. [supabase.com](https://supabase.com) 에서 프로젝트 생성
2. SQL Editor 에서 순서대로 실행
   - `supabase/migrations/0001_init.sql` — 테이블, 예약/취소 함수, 권한
   - `supabase/migrations/0002_dev_purchase.sql` — 결제 없이 수강권 발급 (개발용)
   - `supabase/seed.sql` — 샘플 지점/프로/상품
3. Authentication → URL Configuration 의 Redirect URLs 에 `http://localhost:3000/**` 추가
4. `.env.example` 을 `.env.local` 로 복사하고 Project URL / publishable key(또는 anon key) 입력 후 `npm run dev`
5. `/login` 에서 이메일로 로그인 링크 받아 로그인 (카카오 로그인은 Authentication → Providers 에서 Kakao 를 따로 활성화해야 함)

## 화면 구성

| 경로 | 화면 |
|---|---|
| `/` | 지점 목록 |
| `/studios/[studioId]` | 지점 소속 프로 명단 |
| `/pros/[proId]` | 프로 소개 + 레슨 상품 구매 |
| `/pros/[proId]/book` | 날짜·시간 선택 후 예약 |
| `/me` | 내 예약 / 보유 수강권 / 취소 |
| `/login` | 카카오 로그인 |

화면 코드는 `src/lib/data.ts` 의 함수만 호출합니다. 이 파일이 Supabase 연결 여부에 따라 DB 또는 샘플 데이터를 사용합니다.

## 데이터 구조

```
studios(지점) ─┬─ bays(타석)
               └─ pros(프로) ─┬─ pro_schedules(주간 근무시간)
                              └─ packages(상품) ── passes(구매한 수강권) ── bookings(예약)
```

### 핵심 규칙 (`supabase/migrations/0001_init.sql`)

- **중복 예약 방지**: 같은 프로·같은 타석의 시간 겹침을 DB 제약조건(`exclude using gist`)으로 차단 — 동시에 눌러도 한 명만 성공
- **예약** (`book_lesson`): 수강권 잔여 횟수 확인 → 빈 타석 자동 배정 → 1회 차감을 한 트랜잭션으로 처리
- **취소** (`cancel_booking`): 레슨 3시간 전까지만 가능, 차감된 1회 복구
- 시간은 모두 한국 시간(KST) 기준, 예약은 오늘부터 14일까지 60분 단위

## 다음 단계

- [ ] **결제 연동** (토스페이먼츠 / 포트원) — `0002_dev_purchase.sql` 을 결제 승인 서버로 교체
- [ ] **프로/관리자 화면** — 상품 등록, 근무시간 설정, 레슨 완료·노쇼 처리
- [ ] **알림** — 예약 확정 / 하루 전 리마인드 (카카오 알림톡)
- [ ] 휴무일·특정일 예외 스케줄, 프로 사진 업로드
