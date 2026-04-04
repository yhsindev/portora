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

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
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
