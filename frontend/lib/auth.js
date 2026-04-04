import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  // session 回呼：把 user.email 帶進 session，供 API routes 識別使用者
  callbacks: {
    session({ session }) {
      return session; // session.user.email 預設已包含
    },
  },
});
