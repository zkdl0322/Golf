-- ⚠️ 개발용: 결제 없이 수강권을 발급하는 함수.
-- PG(토스페이먼츠/포트원) 연동 후에는 이 함수를 삭제하고,
-- 결제 승인 서버(service_role 키 사용)에서 passes 를 insert 하세요.
create or replace function purchase_package_dev(p_package_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pkg packages;
  v_pass_id uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  select * into v_pkg from packages where id = p_package_id and is_active;
  if not found then raise exception '판매 중인 상품이 아닙니다'; end if;

  insert into passes (user_id, package_id, pro_id, total_count, remaining_count, expires_at)
  values (auth.uid(), v_pkg.id, v_pkg.pro_id, v_pkg.lesson_count, v_pkg.lesson_count,
          now() + make_interval(days => v_pkg.valid_days))
  returning id into v_pass_id;
  return v_pass_id;
end;
$$;
