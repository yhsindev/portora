from fastapi import FastAPI
import yfinance as yf
import os
import redis
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware


# 載入 .env 檔案中的環境變數
load_dotenv()

# 初始化 FastAPI 應用
app = FastAPI()

# 設定 CORS 中介軟體，允許來自特定來源的請求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化 Redis 客戶端（失敗時降級為無快取模式）
try:
    r = redis.Redis.from_url(
        os.getenv("UPSTASH_REDIS_REST_URL"),
        password=os.getenv("UPSTASH_REDIS_REST_TOKEN"),
        socket_connect_timeout=2,
    )
    r.ping()
except Exception:
    r = None


# 根路由
@app.get("/")
def root():
    return {"message": "Portora API is running"}


# 查詢即時股價
@app.get("/api/quote")
def get_quote(symbol: str = "AAPL"):
    symbol = symbol.upper()
    cache_key = f"quote:{symbol}"

    if r:
        try:
            cached = r.get(cache_key)
            if cached:
                return {"symbol": symbol, "price": float(cached), "source": "cache"}
        except Exception:
            pass

    try:
        ticker = yf.Ticker(symbol)
        price = ticker.fast_info.last_price

        if price is None:
            return {"error": f"找不到股票代號：{symbol}"}

        price = round(float(price), 2)

        if r:
            try:
                r.setex(cache_key, 60, str(price))
            except Exception:
                pass

        return {"symbol": symbol, "price": price, "source": "api"}

    except Exception as e:
        return {"error": f"查詢失敗：{e}"}


# 查詢歷史 K 線資料
@app.get("/api/history")
def get_history(symbol: str = "AAPL", days: int = 120):
    symbol = symbol.upper()

    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=f"{days}d")

        if hist.empty:
            return {"error": f"找不到股票代號：{symbol}"}

        records = [
            {
                "date": date.strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            }
            for date, row in hist.iterrows()
        ]

        return {"symbol": symbol, "data": records}

    except Exception as e:
        return {"error": f"查詢失敗：{e}"}
