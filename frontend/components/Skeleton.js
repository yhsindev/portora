// animate-pulse 是 Tailwind 內建的呼吸動畫，
// 讓灰色佔位塊看起來像「正在載入中」。

// 股價卡片的佔位骨架
export function SkeletonCard() {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 animate-pulse">
      <div className="h-3 bg-slate-800 rounded w-12 mb-3" />
      <div className="flex items-baseline gap-3 mb-2">
        <div className="h-9 bg-slate-800 rounded w-32" />
        <div className="h-4 bg-slate-800 rounded w-24" />
      </div>
      <div className="h-3 bg-slate-800 rounded w-20" />
    </div>
  );
}

// 圖表區域的佔位骨架（價格圖 + RSI 圖）
export function SkeletonChart() {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 animate-pulse space-y-3">
      <div className="h-48 bg-slate-800 rounded-xl" />
      <div className="h-24 bg-slate-800 rounded-xl" />
    </div>
  );
}

// 新聞列表的佔位骨架
export function SkeletonNews() {
  return (
    <div className="space-y-1 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 space-y-2">
          <div className="h-4 bg-slate-800 rounded w-3/4" />
          <div className="h-3 bg-slate-800 rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}
