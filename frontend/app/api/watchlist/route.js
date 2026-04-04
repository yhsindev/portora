import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// GET /api/watchlist → 取得目前使用者的自選股代號清單
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("watchlist")
    .select("symbol")
    .eq("user_email", session.user.email)
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ symbols: data.map((r) => r.symbol) });
}

// POST /api/watchlist  body: { symbol: "TSLA" } → 新增自選股
export async function POST(req) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }

  const { symbol } = await req.json();
  if (!symbol) return Response.json({ error: "缺少 symbol" }, { status: 400 });

  // upsert：已存在就忽略，不存在就新增
  const { error } = await supabase
    .from("watchlist")
    .upsert({ user_email: session.user.email, symbol: symbol.toUpperCase() });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
