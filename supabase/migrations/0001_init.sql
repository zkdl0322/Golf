-- 골프 레슨 예약 앱 초기 스키마
-- 지점(studios) → 프로(pros) → 상품(packages) → 수강권(passes) → 예약(bookings)

create extension if not exists btree_gist;

-- 회원 프로필 (auth.users 와 1:1)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  phone text,
  role text not null default 'member' check (role in ('member', 'pro', 'admin')),
  created_at timestamptz not null default now()
);

-- 지점 (예: TPG 의정부점)
create table studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  created_at timestamptz not null default now()
);

-- 타석
create table bays (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  name text not null,
  unique (studio_id, name)
);

-- 프로 (지점 소속)
create table pros (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  bio text,
  photo_url text,
  created_at timestamptz not null default now()
);

-- 프로의 주간 근무 시간 (weekday: 0=일 ~ 6=토)
create table pro_schedules (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references pros(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (start_time < end_time)
);

-- 레슨 상품 (예: 10회 / 20회 / 30회)
create table packages (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references pros(id) on delete cascade,
  title text not null,
  description text,
  lesson_count int not null check (lesson_count > 0),
  lesson_minutes int not null default 50 check (lesson_minutes > 0),
  price int not null check (price >= 0),
  valid_days int not null default 90,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 구매한 수강권 (남은 횟수 관리)
create table passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id uuid not null references packages(id),
  pro_id uuid not null references pros(id),
  total_count int not null,
  remaining_count int not null check (remaining_count >= 0),
  expires_at timestamptz not null,
  payment_id text, -- PG 결제 키 (결제 연동 후 사용)
  created_at timestamptz not null default now()
);

-- 예약
create table bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pass_id uuid not null references passes(id),
  pro_id uuid not null references pros(id),
  bay_id uuid not null references bays(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'booked' check (status in ('booked', 'cancelled', 'done', 'no_show')),
  created_at timestamptz not null default now(),
  check (starts_at < ends_at),
  -- 같은 프로 / 같은 타석 시간 겹침을 DB 레벨에서 차단 (동시 예약 방지)
  constraint no_pro_overlap exclude using gist (
    pro_id with =, tstzrange(starts_at, ends_at) with &&
  ) where (status = 'booked'),
  constraint no_bay_overlap exclude using gist (
    bay_id with =, tstzrange(starts_at, ends_at) with &&
  ) where (status = 'booked')
);

create index on bookings (user_id, starts_at);

-- 예약: 수강권 1회 차감 + 빈 타석 배정을 한 트랜잭션으로 처리
create or replace function book_lesson(p_pass_id uuid, p_starts_at timestamptz)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pass passes;
  v_minutes int;
  v_ends_at timestamptz;
  v_bay_id uuid;
  v_booking_id uuid;
begin
  select * into v_pass from passes
   where id = p_pass_id and user_id = auth.uid()
   for update;
  if not found then raise exception '수강권을 찾을 수 없습니다'; end if;
  if v_pass.remaining_count <= 0 then raise exception '남은 횟수가 없습니다'; end if;
  if v_pass.expires_at < p_starts_at then raise exception '수강권 유효기간이 지났습니다'; end if;
  if p_starts_at < now() then raise exception '지난 시간은 예약할 수 없습니다'; end if;

  select lesson_minutes into v_minutes from packages where id = v_pass.package_id;
  v_ends_at := p_starts_at + make_interval(mins => v_minutes);

  -- 해당 시간에 비어 있는 타석 하나 선택
  select b.id into v_bay_id
    from bays b
    join pros p on p.studio_id = b.studio_id
   where p.id = v_pass.pro_id
     and not exists (
       select 1 from bookings bk
        where bk.bay_id = b.id and bk.status = 'booked'
          and tstzrange(bk.starts_at, bk.ends_at) && tstzrange(p_starts_at, v_ends_at)
     )
   order by b.name
   limit 1;
  if v_bay_id is null then raise exception '빈 타석이 없습니다'; end if;

  insert into bookings (user_id, pass_id, pro_id, bay_id, starts_at, ends_at)
  values (auth.uid(), v_pass.id, v_pass.pro_id, v_bay_id, p_starts_at, v_ends_at)
  returning id into v_booking_id;

  update passes set remaining_count = remaining_count - 1 where id = v_pass.id;
  return v_booking_id;
exception
  when exclusion_violation then
    raise exception '이미 예약된 시간입니다';
end;
$$;

-- 예약 취소: 수강권 1회 복구 (취소 가능 시간 정책은 여기서 조정)
create or replace function cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking bookings;
begin
  select * into v_booking from bookings
   where id = p_booking_id and user_id = auth.uid() and status = 'booked'
   for update;
  if not found then raise exception '예약을 찾을 수 없습니다'; end if;
  if v_booking.starts_at - now() < interval '3 hours' then
    raise exception '레슨 3시간 전까지만 취소할 수 있습니다';
  end if;

  update bookings set status = 'cancelled' where id = v_booking.id;
  update passes set remaining_count = remaining_count + 1 where id = v_booking.pass_id;
end;
$$;

-- 예약 현황 조회용 (다른 회원 정보는 숨기고 시간/타석만 공개)
create view busy_slots with (security_invoker = false) as
  select pro_id, bay_id, starts_at, ends_at from bookings where status = 'booked';

-- RLS
alter table profiles enable row level security;
alter table studios enable row level security;
alter table bays enable row level security;
alter table pros enable row level security;
alter table pro_schedules enable row level security;
alter table packages enable row level security;
alter table passes enable row level security;
alter table bookings enable row level security;

create policy "공개 조회" on studios for select using (true);
create policy "공개 조회" on bays for select using (true);
create policy "공개 조회" on pros for select using (true);
create policy "공개 조회" on pro_schedules for select using (true);
create policy "공개 조회" on packages for select using (is_active);

create policy "본인 프로필" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "본인 수강권" on passes for select using (user_id = auth.uid());
create policy "본인 예약" on bookings for select using (user_id = auth.uid());
-- passes / bookings 의 insert·update 는 위 함수(security definer)와 결제 서버에서만 수행

grant select on busy_slots to anon, authenticated;

-- 회원가입 시 프로필 자동 생성
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
