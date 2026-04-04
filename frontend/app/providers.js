"use client";
// SessionProvider 必須是 Client Component，
// 因此獨立成一個檔案，再由 layout.js（Server Component）引入包裹。
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
