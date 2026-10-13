export type Studio = {
  id: string;
  name: string;
  address: string | null;
};

export type Bay = {
  id: string;
  studio_id: string;
  name: string;
};

export type Pro = {
  id: string;
  studio_id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
};

export type ProSchedule = {
  pro_id: string;
  weekday: number; // 0=일 ~ 6=토
  start_time: string; // "10:00"
  end_time: string; // "21:00"
};

export type Package = {
  id: string;
  pro_id: string;
  title: string;
  description: string | null;
  lesson_count: number;
  lesson_minutes: number;
  price: number;
};

export type Pass = {
  id: string;
  user_id: string;
  package_id: string;
  pro_id: string;
  total_count: number;
  remaining_count: number;
  expires_at: string;
};

export type BookingStatus = "booked" | "cancelled" | "done" | "no_show";

export type Booking = {
  id: string;
  user_id: string;
  pass_id: string;
  pro_id: string;
  bay_id: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
};

export type Slot = {
  startsAt: string; // ISO
  label: string; // "14:00"
  available: boolean;
};

export type DaySlots = {
  date: string; // "2026-10-14"
  label: string; // "10/14 (수)"
  slots: Slot[];
};
