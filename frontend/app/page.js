"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import PriceChart from "@/components/PriceChart";
import CompareChart from "@/components/CompareChart";
import PortfolioSection from "@/components/PortfolioSection";
import { SkeletonCard, SkeletonChart, SkeletonNews } from "@/components/Skeleton";
import { sma, rsi } from "@/lib/indicators";

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
const LS_KEY = "portora_watchlist";
const LS_NOTES_KEY = "portora_notes";

function loadNote(symbol) {
  try {
    return JSON.parse(localStorage.getItem(LS_NOTES_KEY) || "{}")[symbol] || "";
  } catch { return ""; }
}
function saveNote(symbol, text) {
  try {
    const notes = JSON.parse(localStorage.getItem(LS_NOTES_KEY) || "{}");
    if (text) notes[symbol] = text;
    else delete notes[symbol];
    localStorage.setItem(LS_NOTES_KEY, JSON.stringify(notes));
  } catch {}
}

// Unix 秒數 → 「3 小時前」「2 天前」
function timeAgo(ts) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 3600)  return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

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
  const { data: session } = useSession();
  const [input, setInput] = useState("TSLA");
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [rsiData, setRsiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(true);

  const [news, setNews] = useState([]);

  const [watchlist, setWatchlist] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [groupInput, setGroupInput] = useState("自選股");
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const [etfInput, setEtfInput] = useState("VOO,0050.TW,006208.TW");
  const [etfPeriod, setEtfPeriod] = useState("1y");
  const [etfData, setEtfData] = useState(null);
  const [etfLoading, setEtfLoading] = useState(false);
  const [etfErr, setEtfErr] = useState("");

  const [compareInput, setCompareInput] = useState("AAPL,TSLA,NVDA");
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareErr, setCompareErr] = useState("");

  const [activeTab, setActiveTab] = useState("stock");

  const TABS = [
    { id: "stock",     label: "個股" },
    { id: "portfolio", label: "投資組合" },
    { id: "etf",       label: "ETF 分析" },
    { id: "compare",   label: "多股比較" },
  ];

  useEffect(() => {
    refreshWatchlist();
  }, [session]);

  // 切換股票時載入對應備忘
  useEffect(() => {
    if (data?.symbol) {
      setNote(loadNote(data.symbol));
      setNoteSaved(true);
    }
  }, [data?.symbol]);

  const refreshWatchlist = async () => {
    setWatchlistLoading(true);
    try {
      // 登入：從 Supabase 取得 [{symbol, group_name}]
      // 未登入：localStorage 的純代號陣列，統一包成同樣格式
      let items = [];
      if (session) {
        const res = await fetch("/api/watchlist");
        const json = await res.json();
        items = json.items || [];
      } else {
        items = loadSymbols().map((s) => ({ symbol: s, group_name: "自選股" }));
      }
      if (items.length === 0) { setWatchlist([]); return; }

      // 並行抓即時報價，再把 group_name 合併進去
      const results = await Promise.all(
        items.map(({ symbol, group_name }) =>
          fetch(`${BASE}/api/quote?symbol=${encodeURIComponent(symbol)}`)
            .then((r) => r.json())
            .then((q) => ({ ...q, group_name }))
            .catch(() => ({ symbol, price: null, change_pct: null, group_name }))
        )
      );
      setWatchlist(results.filter((r) => !r.error));
    } catch (e) {
      // silent fail
    } finally {
      setWatchlistLoading(false);
    }
  };

  const addToWatchlist = async (symbol, group_name = "自選股") => {
    if (session) {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, group_name }),
      });
    } else {
      const symbols = loadSymbols();
      if (!symbols.includes(symbol)) saveSymbols([...symbols, symbol]);
    }
    setAddingToWatchlist(false);
    refreshWatchlist();
  };

  const removeFromWatchlist = async (symbol) => {
    if (session) {
      await fetch(`/api/watchlist/${encodeURIComponent(symbol)}`, { method: "DELETE" });
    } else {
      saveSymbols(loadSymbols().filter((s) => s !== symbol));
    }
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
    setNews([]);

    try {
      // quote 和 history 是核心請求，一起發出
      const [quoteRes, histRes] = await Promise.all([
        fetch(`${BASE}/api/quote?symbol=${encodeURIComponent(target)}`),
        fetch(`${BASE}/api/history?symbol=${encodeURIComponent(target)}&days=120`),
      ]);

      const quoteJson = await quoteRes.json();
      const histJson  = await histRes.json();

      // news 是非核心，獨立發出，失敗不影響主流程
      fetch(`${BASE}/api/news?symbol=${encodeURIComponent(target)}`)
        .then((r) => r.ok ? r.json() : { news: [] })
        .then((json) => { if (json.news?.length) setNews(json.news); })
        .catch(() => {});

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
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-12 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Portora</h1>
          {session ? (
            <div className="flex items-center gap-2">
              {session.user?.image && (
                <img src={session.user.image} alt="avatar" className="w-7 h-7 rounded-full" />
              )}
              <span className="text-xs text-slate-400 hidden sm:block">{session.user?.name}</span>
              <button
                onClick={() => signOut()}
                className="text-xs px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200 transition"
              >登出</button>
            </div>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400 transition"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
              Google 登入
            </button>
          )}
        </div>

        {/* 自選股（常駐於所有 Tab 上方，依群組分類顯示） */}
        {(watchlist.length > 0 || watchlistLoading) && (
          <div className="space-y-3">
            {watchlistLoading ? (
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-9 w-28 bg-slate-800 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              // 按 group_name 分組顯示
              Object.entries(
                watchlist.reduce((acc, w) => {
                  const g = w.group_name || "自選股";
                  if (!acc[g]) acc[g] = [];
                  acc[g].push(w);
                  return acc;
                }, {})
              ).map(([group, stocks]) => (
                <div key={group} className="space-y-1.5">
                  {/* 群組標題：點擊收合/展開 */}
                  <button
                    onClick={() => setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }))}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition font-medium"
                  >
                    <span>{collapsedGroups[group] ? "▶" : "▼"}</span>
                    <span>{group}</span>
                    <span className="text-slate-700">({stocks.length})</span>
                  </button>
                  {!collapsedGroups[group] && (
                  <div className="flex gap-2 flex-wrap">
                    {stocks.map((w) => (
                      <button
                        key={w.symbol}
                        onClick={() => { setInput(w.symbol); setActiveTab("stock"); fetchAll(w.symbol); }}
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
                            <span className={w.change_pct >= 0 ? "text-green-400" : "text-red-400"}>
                              {w.change_pct >= 0 ? "+" : ""}{w.change_pct}%
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-600 text-xs">N/A</span>
                        )}
                        <span
                          onClick={(e) => { e.stopPropagation(); removeFromWatchlist(w.symbol); }}
                          className="text-slate-600 hover:text-red-400 text-xs transition ml-1"
                        >✕</span>
                      </button>
                    ))}
                  </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 切換列 */}
        <div className="flex border-b border-slate-800">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-indigo-500 text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: 個股 ── */}
        {activeTab === "stock" && (
          <div className="space-y-4">
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

            {/* 載入中：顯示 Skeleton */}
            {loading && (
              <>
                <SkeletonCard />
                <SkeletonChart />
                <SkeletonNews />
              </>
            )}

            {/* 股價卡片 */}
            {!loading && data && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex items-start justify-between">
                <div>
                  <div className="text-slate-400 text-xs mb-1">{data.symbol}</div>
                  <div className="flex items-baseline gap-3">
                    <div className="text-3xl font-bold">${data.price}</div>
                    {data.change_pct != null && (
                      <div className={`text-sm font-medium ${data.change_pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {data.change >= 0 ? "+" : ""}{data.change}（{data.change_pct >= 0 ? "+" : ""}{data.change_pct}%）
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">來源：{data.source}</div>
                </div>
                {isInWatchlist ? (
                  <button
                    onClick={() => removeFromWatchlist(data.symbol)}
                    className="text-xs px-3 py-1.5 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 transition"
                  >移除自選</button>
                ) : addingToWatchlist ? (
                  <div className="flex gap-1 items-center">
                    <input
                      className="w-24 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-xs outline-none focus:border-indigo-400"
                      value={groupInput}
                      onChange={(e) => setGroupInput(e.target.value)}
                      placeholder="群組名稱"
                      list="group-suggestions"
                      onKeyDown={(e) => e.key === "Enter" && addToWatchlist(data.symbol, groupInput)}
                      autoFocus
                    />
                    <datalist id="group-suggestions">
                      {[...new Set(watchlist.map((w) => w.group_name).filter(Boolean))].map((g) => (
                        <option key={g} value={g} />
                      ))}
                    </datalist>
                    <button
                      onClick={() => addToWatchlist(data.symbol, groupInput)}
                      className="text-xs px-2 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 transition"
                    >確認</button>
                    <button
                      onClick={() => setAddingToWatchlist(false)}
                      className="text-xs text-slate-500 hover:text-slate-300 transition"
                    >✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setGroupInput("自選股"); setAddingToWatchlist(true); }}
                    className="text-xs px-3 py-1.5 rounded-xl border border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10 transition"
                  >+ 加入自選</button>
                )}
              </div>
            )}

            {/* 個股備忘 */}
            {!loading && data && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">備忘</div>
                  {!noteSaved && (
                    <div className="text-xs text-slate-600">未儲存</div>
                  )}
                  {noteSaved && note && (
                    <div className="text-xs text-indigo-500/60">已儲存</div>
                  )}
                </div>
                <textarea
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-slate-600 resize-none transition"
                  rows={2}
                  placeholder="記錄買入理由、目標價、觀察重點..."
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setNoteSaved(false);
                  }}
                  onBlur={() => {
                    saveNote(data.symbol, note);
                    setNoteSaved(true);
                  }}
                />
              </div>
            )}

            {/* K 線圖 */}
            {!loading && chartData && (
              <PriceChart data={chartData} rsiData={rsiData} showMA20 showMA50 />
            )}

            {/* 個股新聞 */}
            {!loading && news.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">最新消息</div>
                {news.map((n, i) => (
                  <a
                    key={i}
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2.5 hover:border-slate-600 transition group"
                  >
                    <div className="text-sm text-slate-200 group-hover:text-white leading-snug">{n.title}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {n.publisher}{n.time ? ` · ${timeAgo(n.time)}` : ""}
                    </div>
                  </a>
                ))}
              </div>
            )}

            {!data && !err && !loading && (
              <p className="text-xs text-slate-500">支援美股（AAPL、TSLA）及台股（2330.TW、0050.TW）</p>
            )}
          </div>
        )}

        {/* ── Tab: 投資組合 ── */}
        {activeTab === "portfolio" && <PortfolioSection />}

        {/* ── Tab: ETF 分析 ── */}
        {activeTab === "etf" && (
          <div className="space-y-3">
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
                  >{label}</button>
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
              >{etfLoading ? "載入中..." : "分析"}</button>
            </div>
            {etfLoading && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 animate-pulse space-y-3">
                <div className="h-48 bg-slate-800 rounded-xl" />
                <div className="h-24 bg-slate-800 rounded-xl" />
              </div>
            )}
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
        )}

        {/* ── Tab: 多股比較 ── */}
        {activeTab === "compare" && (
          <div className="space-y-3">
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
              >{compareLoading ? "載入中..." : "比較"}</button>
            </div>
            {compareLoading && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 animate-pulse">
                <div className="h-48 bg-slate-800 rounded-xl" />
              </div>
            )}
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
        )}

      </div>
    </main>
  );
}
