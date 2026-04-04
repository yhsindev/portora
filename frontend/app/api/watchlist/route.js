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

export async function GET() {
  const session = await getServerSession(authOptions);
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

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }
  const { symbol } = await req.json();
  if (!symbol) return Response.json({ error: "缺少 symbol" }, { status: 400 });

  const { error } = await supabase
    .from("watchlist")
    .upsert({ user_email: session.user.email, symbol: symbol.toUpperCase() });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
