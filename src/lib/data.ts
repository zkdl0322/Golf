// 데이터 접근 계층.
// Supabase 환경변수가 있으면 DB를, 없으면 mock-data.ts 의 샘플 데이터를 사용합니다.
// 화면 코드는 이 파일의 함수만 호출하면 됩니다.
import "server-only";
import * as mock from "./mock-data";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";
import { addDays, dayLabel, kstDate, minutesOf, overlaps, timeOf, todayKst, weekdayOf } from "./time";
import type { Booking, DaySlots, Package, Pass, Pro, ProSchedule, Studio } from "./types";

const SLOT_MINUTES = 60; // 예약 시간 간격
const BOOKING_DAYS = 14; // 오늘부터 며칠까지 예약 가능

export type MyPass = Pass & { package_title: string; pro_name: string };
export type MyBooking = Booking & { pro_name: string; bay_name: string };

type BusySlot = { pro_id: string; bay_id: string; starts_at: string; ends_at: string };

/* ───────────── 로그인 사용자 ───────────── */

export async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return mock.DEMO_USER_ID;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/* ───────────── 지점 / 프로 / 상품 ───────────── */

export async function getStudios(): Promise<Studio[]> {
  if (!isSupabaseConfigured) return mock.studios;
  const supabase = await createClient();
  const { data, error } = await supabase.from("studios").select("id, name, address").order("name");
  if (error) throw error;
  return data;
}

export async function getStudio(id: string): Promise<Studio | null> {
  if (!isSupabaseConfigured) return mock.studios.find((s) => s.id === id) ?? null;
  const supabase = await createClient();
  const { data } = await supabase.from("studios").select("id, name, address").eq("id", id).maybeSingle();
  return data;
}

export async function getPros(studioId: string): Promise<Pro[]> {
  if (!isSupabaseConfigured) return mock.pros.filter((p) => p.studio_id === studioId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pros")
    .select("id, studio_id, name, bio, photo_url")
    .eq("studio_id", studioId)
    .order("name");
  if (error) throw error;
  return data;
}

export async function getPro(id: string): Promise<Pro | null> {
  if (!isSupabaseConfigured) return mock.pros.find((p) => p.id === id) ?? null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("pros")
    .select("id, studio_id, name, bio, photo_url")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function getPackages(proId: string): Promise<Package[]> {
  if (!isSupabaseConfigured) return mock.packages.filter((p) => p.pro_id === proId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("packages")
    .select("id, pro_id, title, description, lesson_count, lesson_minutes, price")
    .eq("pro_id", proId)
    .order("lesson_count");
  if (error) throw error;
  return data;
}

/* ───────────── 예약 가능 시간 ───────────── */

export async function getAvailableSlots(pro: Pro): Promise<DaySlots[]> {
  const from = todayKst();
  const fromIso = kstDate(from, "00:00").toISOString();
  const toIso = kstDate(addDays(from, BOOKING_DAYS), "00:00").toISOString();

  let schedules: ProSchedule[];
  let bayIds: string[];
  let busy: BusySlot[];

  if (!isSupabaseConfigured) {
    schedules = mock.proSchedules.filter((s) => s.pro_id === pro.id);
    bayIds = mock.bays.filter((b) => b.studio_id === pro.studio_id).map((b) => b.id);
    busy = mock.store.bookings.filter(
      (b) => b.status === "booked" && b.starts_at < toIso && b.ends_at > fromIso,
    );
  } else {
    const supabase = await createClient();
    const [s, b] = await Promise.all([
      supabase.from("pro_schedules").select("pro_id, weekday, start_time, end_time").eq("pro_id", pro.id),
      supabase.from("bays").select("id").eq("studio_id", pro.studio_id),
    ]);
    if (s.error) throw s.error;
    if (b.error) throw b.error;
    schedules = s.data;
    bayIds = b.data.map((x) => x.id);
    const busyRes = await supabase
      .from("busy_slots")
      .select("pro_id, bay_id, starts_at, ends_at")
      .lt("starts_at", toIso)
      .gt("ends_at", fromIso)
      .or(bayIds.length ? `pro_id.eq.${pro.id},bay_id.in.(${bayIds.join(",")})` : `pro_id.eq.${pro.id}`);
    if (busyRes.error) throw busyRes.error;
    busy = busyRes.data;
  }

  return computeSlots({ proId: pro.id, from, schedules, bayIds, busy });
}

function computeSlots(args: {
  proId: string;
  from: string;
  schedules: ProSchedule[];
  bayIds: string[];
  busy: BusySlot[];
}): DaySlots[] {
  const now = new Date();
  const days: DaySlots[] = [];

  for (let i = 0; i < BOOKING_DAYS; i++) {
    const date = addDays(args.from, i);
    const daySchedules = args.schedules.filter((s) => s.weekday === weekdayOf(date));
    const slots = daySchedules.flatMap((s) => {
      const result = [];
      for (let m = minutesOf(s.start_time); m + SLOT_MINUTES <= minutesOf(s.end_time); m += SLOT_MINUTES) {
        const start = kstDate(date, timeOf(m));
        const end = new Date(start.getTime() + SLOT_MINUTES * 60_000);
        const overlapping = args.busy.filter((b) =>
          overlaps(start, end, new Date(b.starts_at), new Date(b.ends_at)),
        );
        const proBusy = overlapping.some((b) => b.pro_id === args.proId);
        const busyBays = new Set(overlapping.map((b) => b.bay_id).filter((id) => args.bayIds.includes(id)));
        result.push({
          startsAt: start.toISOString(),
          label: timeOf(m),
          available: start > now && !proBusy && busyBays.size < args.bayIds.length,
        });
      }
      return result;
    });
    if (slots.length > 0) days.push({ date, label: dayLabel(date), slots });
  }
  return days;
}

/* ───────────── 내 수강권 / 예약 ───────────── */

export async function getMyPasses(proId?: string): Promise<MyPass[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  if (!isSupabaseConfigured) {
    return mock.store.passes
      .filter((p) => p.user_id === userId && (!proId || p.pro_id === proId))
      .map((p) => ({
        ...p,
        package_title: mock.packages.find((x) => x.id === p.package_id)?.title ?? "",
        pro_name: mock.pros.find((x) => x.id === p.pro_id)?.name ?? "",
      }));
  }

  const supabase = await createClient();
  let query = supabase
    .from("passes")
    .select("*, packages(title), pros(name)")
    .order("created_at", { ascending: false });
  if (proId) query = query.eq("pro_id", proId);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(({ packages, pros, ...p }) => ({
    ...p,
    package_title: packages?.title ?? "",
    pro_name: pros?.name ?? "",
  }));
}

export async function getMyBookings(): Promise<MyBooking[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  if (!isSupabaseConfigured) {
    return mock.store.bookings
      .filter((b) => b.user_id === userId)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .map((b) => ({
        ...b,
        pro_name: mock.pros.find((x) => x.id === b.pro_id)?.name ?? "",
        bay_name: mock.bays.find((x) => x.id === b.bay_id)?.name ?? "",
      }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*, pros(name), bays(name)")
    .order("starts_at");
  if (error) throw error;
  return data.map(({ pros, bays, ...b }) => ({
    ...b,
    pro_name: pros?.name ?? "",
    bay_name: bays?.name ?? "",
  }));
}

/* ───────────── 구매 / 예약 / 취소 ───────────── */

// TODO: PG 결제 연동 전까지는 결제 없이 수강권을 바로 발급합니다.
export async function purchasePackage(packageId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const pkg = mock.packages.find((p) => p.id === packageId);
    if (!pkg) throw new Error("판매 중인 상품이 아닙니다");
    const expires = new Date();
    expires.setDate(expires.getDate() + 90);
    mock.store.passes.push({
      id: crypto.randomUUID(),
      user_id: mock.DEMO_USER_ID,
      package_id: pkg.id,
      pro_id: pkg.pro_id,
      total_count: pkg.lesson_count,
      remaining_count: pkg.lesson_count,
      expires_at: expires.toISOString(),
    });
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("purchase_package_dev", { p_package_id: packageId });
  if (error) throw new Error(error.message);
}

export async function bookLesson(passId: string, startsAt: string): Promise<void> {
  if (!isSupabaseConfigured) return mockBookLesson(passId, startsAt);
  const supabase = await createClient();
  const { error } = await supabase.rpc("book_lesson", { p_pass_id: passId, p_starts_at: startsAt });
  if (error) throw new Error(error.message);
}

export async function cancelBooking(bookingId: string): Promise<void> {
  if (!isSupabaseConfigured) return mockCancelBooking(bookingId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });
  if (error) throw new Error(error.message);
}

// supabase/migrations/0001_init.sql 의 book_lesson 과 같은 규칙
function mockBookLesson(passId: string, startsAt: string) {
  const pass = mock.store.passes.find((p) => p.id === passId && p.user_id === mock.DEMO_USER_ID);
  if (!pass) throw new Error("수강권을 찾을 수 없습니다");
  if (pass.remaining_count <= 0) throw new Error("남은 횟수가 없습니다");

  const start = new Date(startsAt);
  if (start < new Date()) throw new Error("지난 시간은 예약할 수 없습니다");
  const pkg = mock.packages.find((p) => p.id === pass.package_id)!;
  const end = new Date(start.getTime() + pkg.lesson_minutes * 60_000);

  const active = mock.store.bookings.filter(
    (b) => b.status === "booked" && overlaps(start, end, new Date(b.starts_at), new Date(b.ends_at)),
  );
  if (active.some((b) => b.pro_id === pass.pro_id)) throw new Error("이미 예약된 시간입니다");

  const pro = mock.pros.find((p) => p.id === pass.pro_id)!;
  const bay = mock.bays.find(
    (b) => b.studio_id === pro.studio_id && !active.some((x) => x.bay_id === b.id),
  );
  if (!bay) throw new Error("빈 타석이 없습니다");

  mock.store.bookings.push({
    id: crypto.randomUUID(),
    user_id: mock.DEMO_USER_ID,
    pass_id: pass.id,
    pro_id: pass.pro_id,
    bay_id: bay.id,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    status: "booked",
  });
  pass.remaining_count -= 1;
}

function mockCancelBooking(bookingId: string) {
  const booking = mock.store.bookings.find(
    (b) => b.id === bookingId && b.user_id === mock.DEMO_USER_ID && b.status === "booked",
  );
  if (!booking) throw new Error("예약을 찾을 수 없습니다");
  if (new Date(booking.starts_at).getTime() - Date.now() < 3 * 60 * 60_000) {
    throw new Error("레슨 3시간 전까지만 취소할 수 있습니다");
  }
  booking.status = "cancelled";
  const pass = mock.store.passes.find((p) => p.id === booking.pass_id);
  if (pass) pass.remaining_count += 1;
}
