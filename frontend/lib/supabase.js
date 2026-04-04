import { createClient } from "@supabase/supabase-js";

// service_role key 只在伺服器端（API routes）使用，
// 有完整讀寫權限，絕對不能暴露在前端瀏覽器。
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
