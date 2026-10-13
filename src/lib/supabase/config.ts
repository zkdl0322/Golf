export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// 환경변수가 없으면 샘플 데이터(mock) 모드로 동작합니다.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
