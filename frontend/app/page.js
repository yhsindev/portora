"use client";

import { useState } from "react";
import PriceChart from "@/components/PriceChart";
import { sma, rsi } from "@/lib/indicators";

export default function Home() {
  const [symbol, setSymbol] = useState("TSLA");
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [rsiData, setRsiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    setErr("");
    setData(null);
    setChartData(null);
    setRsiData(null);

    const base = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

    try {
      const [quoteRes, histRes] = await Promise.all([
        fetch(`${base}/api/quote?symbol=${encodeURIComponent(symbol)}`),
        fetch(`${base}/api/history?symbol=${encodeURIComponent(symbol)}&days=120`),
      ]);

      const quoteJson = await quoteRes.json();
      const histJson = await histRes.json();

      if (quoteJson.error) throw new Error(quoteJson.error);
      setData(quoteJson);

      if (!histJson.error && histJson.data) {
        const closes = histJson.data.map((d) => d.close);
        const ma20arr = sma(closes, 20);
        const ma50arr = sma(closes, 50);
        const rsiArr = rsi(closes, 14);

        const enriched = histJson.data.map((d, i) => ({
          ...d,
          ma20: ma20arr[i] != null ? Math.round(ma20arr[i] * 100) / 100 : null,
          ma50: ma50arr[i] != null ? Math.round(ma50arr[i] * 100) / 100 : null,
        }));

        const rsiPoints = histJson.data.map((d, i) => ({
          date: d.date,
          rsi: rsiArr[i] != null ? Math.round(rsiArr[i] * 10) / 10 : null,
        }));

        setChartData(enriched);
        setRsiData(rsiPoints);
      }
    } catch (e) {
      setErr(e.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-xl font-semibold">Portora · 智慧選股儀表板</h1>

        <div className="flex gap-2">
          <input
            className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="例如：TSLA、AAPL、2330.TW"
            onKeyDown={(e) => e.key === "Enter" && fetchAll()}
          />
          <button
            onClick={fetchAll}
            disabled={loading || !symbol}
            className="px-4 py-2 rounded-2xl bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 text-sm font-medium transition"
          >
            {loading ? "查詢中..." : "查詢"}
          </button>
        </div>

        {err && <div className="text-xs text-red-400">錯誤：{err}</div>}

        {data && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
            <div className="text-slate-400 text-xs mb-1">{data.symbol}</div>
            <div className="text-3xl font-bold">${data.price}</div>
            <div className="text-xs text-slate-500 mt-1">來源：{data.source}</div>
          </div>
        )}

        {chartData && (
          <PriceChart data={chartData} rsiData={rsiData} showMA20 showMA50 />
        )}

        {!data && !err && !loading && (
          <p className="text-xs text-slate-500">
            支援美股（AAPL、TSLA）及台股（2330.TW、0050.TW）
          </p>
        )}
      </div>
    </main>
  );
}
