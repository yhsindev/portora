"use client";

import { useState } from "react";

export default function Home() {
  const [symbol, setSymbol] = useState("TSLA");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const fetchQuote = async () => {
    setLoading(true);
    setErr("");
    setData(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE;
      const res = await fetch(`${base}/api/quote?symbol=${encodeURIComponent(symbol)}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setErr(e.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
      <div className="w-full max-w-md bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h1 className="text-xl font-semibold mb-2">Portora · 即時股價查詢</h1>
        <p className="text-sm text-slate-400 mb-4">
          輸入股票代碼，測試前端 ↔ 後端 ↔ API 串接是否正常。
        </p>

        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="例如：TSLA、AAPL"
          />
          <button
            onClick={fetchQuote}
            disabled={loading || !symbol}
            className="px-4 py-2 rounded-2xl bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 text-sm font-medium transition"
          >
            {loading ? "查詢中..." : "查詢"}
          </button>
        </div>

        {err && (
          <div className="text-xs text-red-400 mb-2">
            錯誤：{err}
          </div>
        )}

        {data && !err && (
          <div className="mt-2 border border-slate-800 rounded-2xl p-3 text-sm space-y-1 bg-slate-950/60">
            <div>Symbol：<span className="font-semibold">{data.symbol}</span></div>
            <div>Price：<span className="font-semibold">{data.price}</span></div>
            <div className="text-xs text-slate-500">Source：{data.source}</div>
          </div>
        )}

        {!data && !err && !loading && (
          <p className="text-xs text-slate-500 mt-1">
            提示：先用 TSLA 測試看看，確認整條鏈路有通。
          </p>
        )}
      </div>
    </main>
  );
}
