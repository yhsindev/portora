# Portora · 智慧投資儀表板

> **Portfolio × Aurora**
>
> 極光出現在黑暗之中，卻是最清晰的指引。
> Portora 的願景是成為每一位長期投資者的極光——
> 在資訊紛雜的市場裡，把真正重要的數字照亮，
> 讓你看清自己的持倉、做出屬於自己的判斷。

個人投資輔助工具，整合股價查詢、技術指標、ETF 長期分析與投資組合追蹤，支援美股與台股。

**Live Demo**
- 前端：https://portora.vercel.app
- 後端：https://portora-api.onrender.com

---

## 功能總覽

| 功能 | 說明 |
|------|------|
| **即時股價** | 查詢美股（AAPL、TSLA）與台股（2330.TW、0050.TW），顯示漲跌幅 |
| **技術指標圖** | 價格走勢、MA20、MA50、RSI（含 70/30 參考線） |
| **自選股** | 常用股票快速切換，重整後不消失（localStorage） |
| **個股新聞** | 查詢時自動顯示最新 5 則相關新聞 |
| **多股比較** | 最多 5 檔同時比較，起點統一為 100 的相對報酬圖 |
| **ETF 長期分析** | 自訂 ETF 組合，計算 CAGR、最大回撤、夏普比率、殖利率 |
| **投資組合追蹤** | 逐筆記錄買入（支援定期定額），計算加權均價與未實現損益 |

---

## 專案結構

```
portora/
├── backend/
│   ├── main.py              # FastAPI 主程式（所有 API endpoints）
│   ├── requirements.txt
│   └── keepalive.py         # Redis keepalive 腳本
└── frontend/
    ├── app/
    │   ├── page.js          # 主頁面（所有 UI 與狀態管理）
    │   └── layout.js
    ├── components/
    │   ├── PriceChart.js    # 股價走勢 + 技術指標圖（Recharts）
    │   ├── CompareChart.js  # 多股標準化比較圖
    │   └── PortfolioSection.js  # 投資組合追蹤區塊
    └── lib/
        ├── indicators.js    # SMA、RSI 計算函式
        └── api.js
```

---

## 技術棧

**後端**
- [FastAPI](https://fastapi.tiangolo.com/) — Python REST API 框架
- [yfinance](https://github.com/ranaroussi/yfinance) — Yahoo Finance 資料來源，支援美股與台股，無需 API key
- [Upstash Redis](https://upstash.com/) — 選用快取層，無 Redis 時自動降級

**前端**
- [Next.js 16](https://nextjs.org/) (App Router) — React 框架
- [Tailwind CSS](https://tailwindcss.com/) — 樣式
- [Recharts](https://recharts.org/) — 圖表元件

**部署**
- 前端：[Vercel](https://vercel.com/)
- 後端：[Render](https://render.com/)

---

## 本地開發

### 環境需求
- Python 3.11+
- Node.js LTS（建議使用 nvm）

### 後端

```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

建立 `backend/.env`：

```env
UPSTASH_REDIS_REST_URL=...    # 選用，沒有也能運作
UPSTASH_REDIS_REST_TOKEN=...  # 選用
ALLOWED_ORIGINS=http://localhost:3000
```

啟動：

```bash
uvicorn main:app --reload --port 8000
```

確認：`http://127.0.0.1:8000` → `{"message": "Portora API is running"}`

### 前端

```bash
cd frontend
npm install
```

建立 `frontend/.env.local`：

```env
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
```

啟動：

```bash
npm run dev
```

開啟 `http://localhost:3000`

---

## API 端點

| 端點 | 說明 |
|------|------|
| `GET /api/quote?symbol=TSLA` | 即時股價、漲跌幅 |
| `GET /api/history?symbol=TSLA&days=120` | 歷史 OHLCV |
| `GET /api/news?symbol=TSLA` | 最新 5 則新聞 |
| `GET /api/compare?symbols=AAPL,TSLA&days=60` | 多股標準化比較 |
| `GET /api/etf?symbols=VOO,0050.TW&period=1y` | ETF 長期分析指標 |
