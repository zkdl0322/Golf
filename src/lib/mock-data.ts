// Supabase 연결 전에도 화면을 확인할 수 있도록 쓰는 샘플 데이터.
// supabase/seed.sql 과 같은 내용입니다.
import type { Bay, Booking, Package, Pass, Pro, ProSchedule, Studio } from "./types";

export const DEMO_USER_ID = "demo-user";

export const studios: Studio[] = [
  { id: "11111111-0000-0000-0000-000000000001", name: "TPG 의정부점", address: "경기 의정부시" },
  { id: "11111111-0000-0000-0000-000000000002", name: "TPG 양주점", address: "경기 양주시" },
];

const [uijeongbu, yangju] = studios.map((s) => s.id);

export const bays: Bay[] = [
  { id: "bay-u1", studio_id: uijeongbu, name: "1번 타석" },
  { id: "bay-u2", studio_id: uijeongbu, name: "2번 타석" },
  { id: "bay-u3", studio_id: uijeongbu, name: "3번 타석" },
  { id: "bay-y1", studio_id: yangju, name: "1번 타석" },
  { id: "bay-y2", studio_id: yangju, name: "2번 타석" },
];

export const pros: Pro[] = [
  { id: "22222222-0000-0000-0000-000000000001", studio_id: uijeongbu, name: "고영태 프로", bio: "KPGA 정회원 · 드라이버 교정 전문", photo_url: null },
  { id: "22222222-0000-0000-0000-000000000002", studio_id: uijeongbu, name: "김영근 프로", bio: "KLPGA 출신 · 숏게임/퍼팅 전문", photo_url: null },
  { id: "22222222-0000-0000-0000-000000000003", studio_id: yangju, name: "박지훈 프로", bio: "입문자 레슨 10년차", photo_url: null },
];

// 화~토 10:00~21:00 근무
export const proSchedules: ProSchedule[] = pros.flatMap((p) =>
  [2, 3, 4, 5, 6].map((weekday) => ({
    pro_id: p.id,
    weekday,
    start_time: "10:00",
    end_time: "21:00",
  })),
);

const packageTemplates = [
  { title: "레슨 10회", description: "기초 스윙 점검 + 주 1~2회 추천", lesson_count: 10, price: 500000 },
  { title: "레슨 20회", description: "스윙 교정 집중 과정", lesson_count: 20, price: 900000 },
  { title: "레슨 30회", description: "필드 레슨 1회 포함", lesson_count: 30, price: 1200000 },
];

export const packages: Package[] = pros.flatMap((p, i) =>
  packageTemplates.map((t, j) => ({
    id: `pkg-${i + 1}-${j + 1}`,
    pro_id: p.id,
    lesson_minutes: 50,
    ...t,
  })),
);

// 서버 메모리에 저장되는 구매/예약 내역 (서버 재시작 시 초기화)
type MockStore = { passes: Pass[]; bookings: Booking[] };
const g = globalThis as typeof globalThis & { __golfMockStore?: MockStore };
export const store: MockStore = (g.__golfMockStore ??= { passes: [], bookings: [] });
