# Portora

### 智慧投資儀表板 MVP（個人 Side Project）

目標：
- 把「開一堆券商 / Yahoo / TradingView / 新聞頁面」整合成一個畫面
- 提供即時股價查詢與後續擴充空間（自選股、技術指標、AI 分析）

目前進度：
- ✅ FastAPI 後端：/api/quote 取得即時股價（Alpha Vantage）
- ✅ Upstash Redis：作為快取層，減少 API 請求
- ✅ Next.js 前端：簡易查價介面，確認整條串接正常

---

## 專案結構

```txt
portora/
├── backend/        # FastAPI 後端服務
├── frontend/       # Next.js + Tailwind 前端
└── docs/           # 規劃文件、設計 & 開發筆記
```
## 環境需求
- Python 3.11+
- Node.js（使用 nvm，建議 LTS / v24.x）
- npm

## 後端啟動方式
```txt
cd backend
python3 -m venv venv        # 若已建立可略過
source venv/bin/activate
pip install -r requirements.txt
```
### 設定環境變數（請勿提交到 Git）
```txt
建立 backend/.env，內容包含：
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
ALPHA_VANTAGE_API_KEY=...

uvicorn main:app --reload --port 8000
啟動後可測試：http://127.0.0.1:8000 → {"message": "Portora API is running"}
http://127.0.0.1:8000/api/quote?symbol=TSLA
```
## 前端啟動方式
```txt
cd frontend
npm install            # 建置新環境時執行一次
npm run dev
建立 frontend/.env.local：
env
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
```
- 開啟：http://localhost:3000
- 輸入 TSLA 測試查價，確認前後端串接成功。

## Keep Alive（Upstash Redis）
- 為避免免費版 Upstash 資料庫因長期無流量被歸檔：
```txt
cd backend
source venv/bin/activate
python keepalive.py
```
- 詳細說明見 docs/KEEPALIVE.md。
