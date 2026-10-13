export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Supabase 대시보드에 따라 publishable key 또는 anon key 로 안내됩니다. 둘 다 지원합니다.
export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// 환경변수가 없으면 샘플 데이터(mock) 모드로 동작합니다.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
