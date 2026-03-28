from fastapi import FastAPI
import yfinance as yf
import os
import json
import redis
from pathlib import Path
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware


# 載入 .env 檔案中的環境變數
load_dotenv()

# 初始化 FastAPI 應用
app = FastAPI()

# 設定 CORS 中介軟體，允許來自特定來源的請求
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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

# 自選股清單檔案路徑
WATCHLIST_FILE = Path(__file__).parent / "watchlist.json"


def load_watchlist() -> list[str]:
    if not WATCHLIST_FILE.exists():
        return []
    try:
        return json.loads(WATCHLIST_FILE.read_text())
    except Exception:
        return []


def save_watchlist(symbols: list[str]):
    WATCHLIST_FILE.write_text(json.dumps(symbols))


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


# 取得自選股清單
@app.get("/api/watchlist")
def get_watchlist():
    return {"symbols": load_watchlist()}


# 新增股票到自選股
@app.post("/api/watchlist")
def add_to_watchlist(symbol: str):
    symbol = symbol.upper()
    symbols = load_watchlist()
    if symbol not in symbols:
        symbols.append(symbol)
        save_watchlist(symbols)
    return {"symbols": symbols}


# 從自選股移除股票
@app.delete("/api/watchlist/{symbol}")
def remove_from_watchlist(symbol: str):
    symbol = symbol.upper()
    symbols = [s for s in load_watchlist() if s != symbol]
    save_watchlist(symbols)
    return {"symbols": symbols}


# 批次取得自選股即時報價
@app.get("/api/watchlist/quotes")
def get_watchlist_quotes():
    symbols = load_watchlist()
    if not symbols:
        return {"quotes": []}

    quotes = []
    for symbol in symbols:
        try:
            info = yf.Ticker(symbol).fast_info
            price = info.last_price
            prev_close = info.previous_close
            if price is not None and prev_close:
                change = round(float(price) - float(prev_close), 2)
                change_pct = round(change / float(prev_close) * 100, 2)
            else:
                change = change_pct = None
            quotes.append({
                "symbol": symbol,
                "price": round(float(price), 2) if price else None,
                "change": change,
                "change_pct": change_pct,
            })
        except Exception:
            quotes.append({"symbol": symbol, "price": None, "change": None, "change_pct": None})

    return {"quotes": quotes}
