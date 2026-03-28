"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

const COLORS = ["#6366f1", "#f59e0b", "#22c55e", "#f97316", "#a78bfa"];
const TICK = { fill: "#64748b", fontSize: 10 };

function fmtDate(str) {
  if (!str) return "";
  const [, m, d] = str.split("-");
  return `${m}/${d}`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs space-y-0.5 shadow-lg">
      <div className="text-slate-400 mb-1">{label}</div>
      {payload.map((p) =>
        p.value != null ? (
          <div key={p.dataKey} style={{ color: p.color }}>
            {p.name}：{p.value >= 100 ? "+" : ""}{(p.value - 100).toFixed(2)}%
          </div>
        ) : null
      )}
    </div>
  );
}

export default function CompareChart({ data }) {
  if (!data?.length) return null;

  // 合併成 [{date, AAPL: 100.5, TSLA: 98.2, ...}] 格式
  const maxLen = Math.max(...data.map((d) => d.dates.length));
  const chartData = Array.from({ length: maxLen }, (_, i) => {
    const point = { date: data[0].dates[i] };
    data.forEach((d) => {
      if (d.normalized[i] != null) point[d.symbol] = d.normalized[i];
    });
    return point;
  });

  const interval = Math.max(1, Math.floor(maxLen / 6));

  return (
    <div style={{ width: "100%", height: 280, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            interval={interval}
            tick={TICK}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={TICK}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) => `${v >= 100 ? "+" : ""}${(v - 100).toFixed(0)}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8", paddingTop: 8 }} />
          {/* 起點基準線 */}
          <ReferenceLine y={100} stroke="#334155" strokeDasharray="4 3" />
          {data.map((d, i) => (
            <Line
              key={d.symbol}
              type="monotone"
              dataKey={d.symbol}
              dot={false}
              strokeWidth={1.8}
              stroke={COLORS[i % COLORS.length]}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
