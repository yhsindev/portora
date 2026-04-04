// NextAuth v5 的 App Router 整合方式：
// 把 handlers 直接 export 為 GET 和 POST，
// Next.js 會把 /api/auth/* 的所有請求都交給 NextAuth 處理。
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
