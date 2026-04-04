import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// DELETE /api/watchlist/TSLA → 移除自選股
export async function DELETE(req, { params }) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }

  const symbol = (await params).symbol.toUpperCase();

  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_email", session.user.email)
    .eq("symbol", symbol);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
