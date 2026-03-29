"use client";

import { useState, useEffect } from "react";
import PriceChart from "@/components/PriceChart";
import CompareChart from "@/components/CompareChart";
import PortfolioSection from "@/components/PortfolioSection";
import { sma, rsi } from "@/lib/indicators";

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
const LS_KEY = "portora_watchlist";

// localStorage 輔助函式：讀取自選股代號陣列
function loadSymbols() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

// localStorage 輔助函式：儲存自選股代號陣列
function saveSymbols(symbols) {
  localStorage.setItem(LS_KEY, JSON.stringify(symbols));
}

export default function Home() {
  const [input, setInput] = useState("TSLA");
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [rsiData, setRsiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [watchlist, setWatchlist] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);

  const [etfInput, setEtfInput] = useState("VOO,0050.TW,006208.TW");
  const [etfPeriod, setEtfPeriod] = useState("1y");
  const [etfData, setEtfData] = useState(null);
  const [etfLoading, setEtfLoading] = useState(false);
  const [etfErr, setEtfErr] = useState("");

  const [compareInput, setCompareInput] = useState("AAPL,TSLA,NVDA");
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareErr, setCompareErr] = useState("");

  useEffect(() => {
    refreshWatchlist();
  }, []);

  // 從 localStorage 讀出代號，並行呼叫後端取得即時報價
  const refreshWatchlist = async () => {
    setWatchlistLoading(true);
    try {
      const symbols = loadSymbols();
      if (symbols.length === 0) {
        setWatchlist([]);
        return;
      }
      const results = await Promise.all(
        symbols.map((sym) =>
          fetch(`${BASE}/api/quote?symbol=${encodeURIComponent(sym)}`)
            .then((r) => r.json())
            .catch(() => ({ symbol: sym, price: null, change_pct: null }))
        )
      );
      setWatchlist(results.filter((r) => !r.error));
    } catch (e) {
      // silent fail
    } finally {
      setWatchlistLoading(false);
    }
  };

  const addToWatchlist = (symbol) => {
    const symbols = loadSymbols();
    if (!symbols.includes(symbol)) {
      saveSymbols([...symbols, symbol]);
    }
    refreshWatchlist();
  };

  const removeFromWatchlist = (symbol) => {
    saveSymbols(loadSymbols().filter((s) => s !== symbol));
    setWatchlist((prev) => prev.filter((w) => w.symbol !== symbol));
  };

  const isInWatchlist = watchlist.some((w) => w.symbol === data?.symbol);

  const fetchEtf = async (period = etfPeriod) => {
    setEtfLoading(true);
    setEtfData(null);
    setEtfErr("");
    try {
      const res = await fetch(
        `${BASE}/api/etf?symbols=${encodeURIComponent(etfInput)}&period=${period}`
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (!json.data?.length) throw new Error("查無資料");
      setEtfData(json.data);
    } catch (e) {
      setEtfErr(e.message || "載入失敗");
    } finally {
      setEtfLoading(false);
    }
  };

  const fetchCompare = async () => {
    setCompareLoading(true);
    setCompareData(null);
    setCompareErr("");
    try {
      const res = await fetch(
        `${BASE}/api/compare?symbols=${encodeURIComponent(compareInput)}&days=60`
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (!json.data?.length) throw new Error("找不到任何股票資料，請確認代號是否正確");
      setCompareData(json.data);
    } catch (e) {
      setCompareErr(e.message || "比較失敗");
    } finally {
      setCompareLoading(false);
    }
  };

  const fetchAll = async (sym) => {
    const target = (sym || input).toUpperCase();
    if (!target) return;
    setLoading(true);
    setErr("");
    setData(null);
    setChartData(null);
    setRsiData(null);

    try {
      const [quoteRes, histRes] = await Promise.all([
        fetch(`${BASE}/api/quote?symbol=${encodeURIComponent(target)}`),
        fetch(`${BASE}/api/history?symbol=${encodeURIComponent(target)}&days=120`),
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

        {/* 自選股區塊 */}
        {(watchlist.length > 0 || watchlistLoading) && (
          <div className="space-y-2">
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              自選股
            </div>
            {watchlistLoading ? (
              <div className="text-xs text-slate-600">載入中...</div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {watchlist.map((w) => (
                  <button
                    key={w.symbol}
                    onClick={() => {
                      setInput(w.symbol);
                      fetchAll(w.symbol);
                    }}
                    className={`group flex items-center gap-2 border rounded-2xl px-3 py-2 text-sm transition ${
                      data?.symbol === w.symbol
                        ? "bg-indigo-500/20 border-indigo-500"
                        : "bg-slate-900 border-slate-800 hover:border-slate-600"
                    }`}
                  >
                    <span className="font-medium">{w.symbol}</span>
                    {w.price != null ? (
                      <>
                        <span className="text-slate-300">${w.price}</span>
                        <span
                          className={
                            w.change_pct >= 0 ? "text-green-400" : "text-red-400"
                          }
                        >
                          {w.change_pct >= 0 ? "+" : ""}
                          {w.change_pct}%
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-600 text-xs">N/A</span>
                    )}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWatchlist(w.symbol);
                      }}
                      className="text-slate-600 hover:text-red-400 text-xs transition ml-1"
                    >
                      ✕
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 搜尋列 */}
        <div className="flex gap-2">
          <input
            className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="例如：TSLA、AAPL、2330.TW"
            onKeyDown={(e) => e.key === "Enter" && fetchAll()}
          />
          <button
            onClick={() => fetchAll()}
            disabled={loading || !input}
            className="px-4 py-2 rounded-2xl bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 text-sm font-medium transition"
          >
            {loading ? "查詢中..." : "查詢"}
          </button>
        </div>

        {err && <div className="text-xs text-red-400">錯誤：{err}</div>}

        {/* 股價卡片 */}
        {data && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex items-start justify-between">
            <div>
              <div className="text-slate-400 text-xs mb-1">{data.symbol}</div>
              <div className="flex items-baseline gap-3">
                <div className="text-3xl font-bold">${data.price}</div>
                {data.change_pct != null && (
                  <div className={`text-sm font-medium ${data.change_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {data.change >= 0 ? "+" : ""}{data.change} ({data.change_pct >= 0 ? "+" : ""}{data.change_pct}%)
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-1">來源：{data.source}</div>
            </div>
            <button
              onClick={() =>
                isInWatchlist
                  ? removeFromWatchlist(data.symbol)
                  : addToWatchlist(data.symbol)
              }
              className={`text-xs px-3 py-1.5 rounded-xl border transition ${
                isInWatchlist
                  ? "border-red-500/50 text-red-400 hover:bg-red-500/10"
                  : "border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10"
              }`}
            >
              {isInWatchlist ? "移除自選" : "+ 加入自選"}
            </button>
          </div>
        )}

        {/* K 線圖 */}
        {chartData && (
          <PriceChart data={chartData} rsiData={rsiData} showMA20 showMA50 />
        )}

        {!data && !err && !loading && watchlist.length === 0 && (
          <p className="text-xs text-slate-500">
            支援美股（AAPL、TSLA）及台股（2330.TW、0050.TW）
          </p>
        )}

        {/* 投資組合追蹤 */}
        <PortfolioSection />

        {/* ETF 長期分析區塊 */}
        <div className="border-t border-slate-800 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-300">ETF 長期分析</div>
            <div className="flex gap-1">
              {[["1mo","1M"],["3mo","3M"],["6mo","6M"],["1y","1Y"],["3y","3Y"],["5y","5Y"]].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => { setEtfPeriod(val); fetchEtf(val); }}
                  className={`px-2 py-1 rounded-lg text-xs transition ${
                    etfPeriod === val
                      ? "bg-indigo-500 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
              value={etfInput}
              onChange={(e) => setEtfInput(e.target.value.toUpperCase())}
              placeholder="最多 5 檔，逗號分隔，例如：VOO,VTI,QQQ,0050.TW"
              onKeyDown={(e) => e.key === "Enter" && fetchEtf()}
            />
            <button
              onClick={() => fetchEtf()}
              disabled={etfLoading || !etfInput}
              className="px-4 py-2 rounded-2xl bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-sm font-medium transition"
            >
              {etfLoading ? "載入中..." : "分析"}
            </button>
          </div>
          {etfLoading && <div className="text-xs text-slate-500">載入中...</div>}
          {etfErr && <div className="text-xs text-red-400">錯誤：{etfErr}</div>}

          {etfData && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-4">
              <CompareChart data={etfData} />
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="text-left py-1">ETF</th>
                    <th className="text-right py-1">總報酬</th>
                    <th className="text-right py-1">年化(CAGR)</th>
                    <th className="text-right py-1">最大回撤</th>
                    <th className="text-right py-1">夏普</th>
                    <th className="text-right py-1">殖利率</th>
                  </tr>
                </thead>
                <tbody>
                  {etfData.map((d) => (
                    <tr key={d.symbol} className="border-b border-slate-800/50">
                      <td className="py-1.5 font-medium">{d.symbol}</td>
                      <td className={`text-right ${d.total_return >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {d.total_return >= 0 ? "+" : ""}{d.total_return}%
                      </td>
                      <td className={`text-right ${d.cagr >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {d.cagr >= 0 ? "+" : ""}{d.cagr}%
                      </td>
                      <td className="text-right text-red-400">{d.max_drawdown}%</td>
                      <td className="text-right text-slate-300">{d.sharpe ?? "—"}</td>
                      <td className="text-right text-slate-300">{d.div_yield != null ? `${d.div_yield}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 多股比較區塊 */}
        <div className="border-t border-slate-800 pt-4 space-y-3">
          <div className="text-sm font-medium text-slate-300">多股比較</div>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-3 py-2 text-sm outline-none focus:border-indigo-400"
              value={compareInput}
              onChange={(e) => setCompareInput(e.target.value.toUpperCase())}
              placeholder="用逗號分隔，例如：AAPL,TSLA,NVDA"
              onKeyDown={(e) => e.key === "Enter" && fetchCompare()}
            />
            <button
              onClick={fetchCompare}
              disabled={compareLoading || !compareInput}
              className="px-4 py-2 rounded-2xl bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-sm font-medium transition"
            >
              {compareLoading ? "載入中..." : "比較"}
            </button>
          </div>

          {compareErr && <div className="text-xs text-red-400">錯誤：{compareErr}</div>}

          {compareData && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="text-xs text-slate-400">60 天相對報酬（起點 = 0%）</div>
              <CompareChart data={compareData} />
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="text-left py-1">代號</th>
                    <th className="text-right py-1">現價</th>
                    <th className="text-right py-1">今日</th>
                    <th className="text-right py-1">60 天報酬</th>
                  </tr>
                </thead>
                <tbody>
                  {compareData.map((d) => (
                    <tr key={d.symbol} className="border-b border-slate-800/50">
                      <td className="py-1.5 font-medium">{d.symbol}</td>
                      <td className="text-right text-slate-300">${d.price ?? "—"}</td>
                      <td className={`text-right ${d.change_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {d.change_pct != null ? `${d.change_pct >= 0 ? "+" : ""}${d.change_pct}%` : "—"}
                      </td>
                      <td className={`text-right ${d.total_return >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {d.total_return >= 0 ? "+" : ""}{d.total_return}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
