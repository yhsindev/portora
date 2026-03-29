"use client";
import { useState, useEffect } from "react";

const LS_KEY = "portora_portfolio";
const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

// 從 localStorage 讀取所有交易記錄
function loadTxns() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}
// 將交易記錄寫入 localStorage
function saveTxns(txns) {
  localStorage.setItem(LS_KEY, JSON.stringify(txns));
}

export default function PortfolioSection() {
  const today = new Date().toISOString().split("T")[0];

  const [txns, setTxns] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [form, setForm] = useState({ symbol: "", date: today, shares: "", price: "" });
  const [expanded, setExpanded] = useState({});

  // 頁面載入時從 localStorage 讀資料，並抓即時報價
  useEffect(() => {
    const saved = loadTxns();
    setTxns(saved);
    if (saved.length) fetchQuotes(saved);
  }, []);

  // 對所有持股並行呼叫 /api/quote，取得即時價格
  const fetchQuotes = async (list) => {
    const symbols = [...new Set(list.map((t) => t.symbol))];
    setQuotesLoading(true);
    const results = await Promise.all(
      symbols.map((sym) =>
        fetch(`${BASE}/api/quote?symbol=${encodeURIComponent(sym)}`)
          .then((r) => r.json())
          .catch(() => ({ symbol: sym, price: null }))
      )
    );
    const map = {};
    results.filter((r) => !r.error).forEach((r) => { map[r.symbol] = r; });
    setQuotes(map);
    setQuotesLoading(false);
  };

  const addTxn = () => {
    const { symbol, date, shares, price } = form;
    if (!symbol.trim() || !date || !+shares || !+price) return;
    const next = [
      ...txns,
      {
        id: Date.now().toString(),
        symbol: symbol.trim().toUpperCase(),
        date,
        shares: +shares,
        price: +price,
      },
    ].sort((a, b) => a.date.localeCompare(b.date)); // 按日期排序
    saveTxns(next);
    setTxns(next);
    fetchQuotes(next);
    setForm((f) => ({ ...f, symbol: "", shares: "", price: "" }));
  };

  const removeTxn = (id) => {
    const next = txns.filter((t) => t.id !== id);
    saveTxns(next);
    setTxns(next);
    next.length ? fetchQuotes(next) : setQuotes({});
  };

  // 將交易記錄按股票代號分組，計算每檔持股的統計數字
  const holdings = Object.entries(
    txns.reduce((acc, t) => {
      if (!acc[t.symbol]) acc[t.symbol] = [];
      acc[t.symbol].push(t);
      return acc;
    }, {})
  ).map(([symbol, list]) => {
    const totalShares = list.reduce((s, t) => s + t.shares, 0);
    const totalCost   = list.reduce((s, t) => s + t.shares * t.price, 0);
    const avgCost     = totalCost / totalShares;        // 加權平均成本
    const curPrice    = quotes[symbol]?.price ?? null;
    const curValue    = curPrice != null ? totalShares * curPrice : null;
    const pnl         = curValue != null ? curValue - totalCost : null;
    const pnlPct      = pnl     != null ? (pnl / totalCost) * 100 : null;
    return { symbol, list, totalShares, totalCost, avgCost, curPrice, curValue, pnl, pnlPct };
  });

  // 格式化輔助函式
  const f2  = (n) => n?.toFixed(2) ?? "—";
  const pct = (n) => n != null ? `${n >= 0 ? "+" : ""}${n.toFixed(2)}%` : "—";
  const clr = (n) => n >= 0 ? "text-green-400" : "text-red-400";

  return (
    <div className="border-t border-slate-800 pt-4 space-y-3">
      <div className="text-sm font-medium text-slate-300">投資組合</div>

      {/* 新增買入記錄表單 */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-3 space-y-2">
        <div className="text-xs text-slate-500">新增買入記錄</div>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
            placeholder="代號，例如 VOO"
            value={form.symbol}
            onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addTxn()}
          />
          <input
            type="date"
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
          <input
            type="number"
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
            placeholder="股數"
            min="0"
            step="any"
            value={form.shares}
            onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addTxn()}
          />
          <input
            type="number"
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
            placeholder="買入價"
            min="0"
            step="any"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addTxn()}
          />
        </div>
        <button
          onClick={addTxn}
          disabled={!form.symbol || !form.shares || !form.price}
          className="w-full py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500 text-sm font-medium transition"
        >
          + 加入記錄
        </button>
      </div>

      {/* 報價更新中提示 */}
      {quotesLoading && (
        <div className="text-xs text-slate-500">更新報價中...</div>
      )}

      {/* 每檔持股卡片 */}
      {holdings.map((h) => (
        <div key={h.symbol} className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          {/* 摘要列，點擊可展開明細 */}
          <div
            className="p-4 cursor-pointer hover:bg-slate-800/30 transition select-none"
            onClick={() => setExpanded((e) => ({ ...e, [h.symbol]: !e[h.symbol] }))}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">{h.symbol}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {f2(h.totalShares)} 股 · 均價 {f2(h.avgCost)} · 共 {h.list.length} 筆
                </div>
              </div>
              <div className="text-right">
                {h.curValue != null ? (
                  <>
                    <div className="text-sm font-medium">{f2(h.curValue)}</div>
                    <div className={`text-xs ${clr(h.pnlPct)}`}>
                      {h.pnl >= 0 ? "+" : ""}{f2(h.pnl)}（{pct(h.pnlPct)}）
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-600">報價載入中</div>
                )}
              </div>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-slate-500">
              <span>總成本 {f2(h.totalCost)}</span>
              {h.curPrice != null && <span>現價 {f2(h.curPrice)}</span>}
            </div>
          </div>

          {/* 展開後顯示每筆交易 */}
          {expanded[h.symbol] && (
            <div className="border-t border-slate-800 divide-y divide-slate-800/50">
              {h.list.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between px-4 py-2 text-xs text-slate-400 hover:bg-slate-800/20"
                >
                  <span className="w-24">{t.date}</span>
                  <span>{t.shares} 股 @ {t.price}</span>
                  <span className="text-slate-600 w-20 text-right">{f2(t.shares * t.price)}</span>
                  <button
                    onClick={() => removeTxn(t.id)}
                    className="text-slate-600 hover:text-red-400 transition ml-3"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {txns.length === 0 && (
        <div className="text-xs text-slate-600">尚未新增任何買入記錄</div>
      )}
    </div>
  );
}
