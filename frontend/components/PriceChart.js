"use client";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

// 統一 tick 和格線樣式
const TICK = { fill: "#64748b", fontSize: 10 };
const GRID = { stroke: "#1e293b" };

// 把 "2025-01-15" 轉成 "01/15"
function fmtDate(str) {
  if (!str) return "";
  const [, m, d] = str.split("-");
  return `${m}/${d}`;
}

// 自訂 Tooltip
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs space-y-0.5 shadow-lg">
      <div className="text-slate-400 mb-1">{label}</div>
      {payload.map((p) =>
        p.value != null ? (
          <div key={p.dataKey} style={{ color: p.color }}>
            {p.name}：{Number(p.value).toFixed(2)}
          </div>
        ) : null
      )}
    </div>
  );
}

export default function PriceChart({ data, showMA20, showMA50, rsiData }) {
  // 自動計算 X 軸間隔，約顯示 6 個日期標記
  const xInterval = Math.max(1, Math.floor(data.length / 6));
  const rsiInterval = Math.max(1, Math.floor((rsiData?.length ?? 0) / 6));

  return (
    <div
      className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl p-4"
      style={{ minWidth: 0 }}
    >
      {/* ── K 線圖 ── */}
      <div className="text-sm text-slate-300 font-medium mb-3">日線價格</div>
      <div style={{ width: "100%", height: 280, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID} strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              interval={xInterval}
              tick={TICK}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={["dataMin - 5", "dataMax + 5"]}
              tick={TICK}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
              width={58}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8", paddingTop: 8 }} />
            <Line
              type="monotone"
              dataKey="close"
              dot={false}
              strokeWidth={2}
              stroke="#6366f1"
              name="Close"
            />
            {showMA20 && (
              <Line
                type="monotone"
                dataKey="ma20"
                dot={false}
                strokeWidth={1.2}
                stroke="#f59e0b"
                name="MA20"
              />
            )}
            {showMA50 && (
              <Line
                type="monotone"
                dataKey="ma50"
                dot={false}
                strokeWidth={1.2}
                stroke="#f97316"
                name="MA50"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── RSI 圖 ── */}
      <div className="text-sm text-slate-300 font-medium mb-2 mt-5">RSI(14)</div>
      <div style={{ width: "100%", height: 120, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rsiData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID} strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              interval={rsiInterval}
              tick={TICK}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[30, 50, 70]}
              tick={TICK}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* 超買線（紅虛線）*/}
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1} />
            {/* 超賣線（綠虛線）*/}
            <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="4 3" strokeWidth={1} />
            <Line
              type="monotone"
              dataKey="rsi"
              dot={false}
              strokeWidth={1.5}
              stroke="#a78bfa"
              name="RSI(14)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
