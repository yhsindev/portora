import { getServerSession } from "next-auth";
import { supabase } from "@/lib/supabase";
import GoogleProvider from "next-auth/providers/google";

const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  })],
};

// GET /api/watchlist → 回傳 [{symbol, group_name}]
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("watchlist")
    .select("symbol, group_name")
    .eq("user_email", session.user.email)
    .order("group_name", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ items: data });
}

// POST /api/watchlist  body: { symbol, group_name } → 新增自選股
export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }
  const { symbol, group_name = "自選股" } = await req.json();
  if (!symbol) return Response.json({ error: "缺少 symbol" }, { status: 400 });

  const { error } = await supabase.from("watchlist").upsert({
    user_email: session.user.email,
    symbol: symbol.toUpperCase(),
    group_name,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
