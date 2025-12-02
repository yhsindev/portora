"use client";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

export default function PriceChart({ data, showMA20, showMA50, rsiData }) {
  return (
    <div className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl p-3"
         style={{ minWidth: 0 }}>
      <div className="text-sm text-slate-300 mb-2">日線價格</div>
      {/* 固定高度，避免百分比在 SSR/隱藏容器得到 -1 */}
      <div style={{ width: "100%", height: 260, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" hide />
            <YAxis domain={["dataMin", "dataMax"]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="close" dot={false} strokeWidth={1.5} name="Close" />
            {showMA20 && <Line type="monotone" dataKey="ma20" dot={false} strokeWidth={1} name="MA20" />}
            {showMA50 && <Line type="monotone" dataKey="ma50" dot={false} strokeWidth={1} name="MA50" />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-sm text-slate-300 mb-2 mt-3">RSI(14)</div>
      <div style={{ width: "100%", height: 100, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rsiData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" hide />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="rsi" dot={false} strokeWidth={1} name="RSI(14)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}