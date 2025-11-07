from fastapi import FastAPI
import requests
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
    allow_origins=["http://localhost:3000","http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 從 .env 檔案讀取 Redis 連線資訊
REDIS_URL = os.getenv("UPSTASH_REDIS_REST_URL")
REDIS_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN")

# 初始化 Redis 客戶端
r = redis.Redis.from_url(REDIS_URL, password=REDIS_TOKEN)

# 根路由
@app.get("/")
def root():
    return {"message": "Portora API is running"}

# 查詢股市報價
@app.get("/api/quote")
def get_quote(symbol: str = "AAPL"):
    cache_key = f"quote:{symbol}"
    cached = r.get(cache_key)  # 嘗試從 Redis 中取得快取資料
    if cached:
        return {"symbol": symbol, "price": float(cached), "source": "cache"}

    # 使用 Alpha Vantage API 獲取股市資料
    ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
    url = f"https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol={symbol}&interval=5min&apikey={ALPHA_VANTAGE_API_KEY}"
    
    try:
        # 發送請求到 Alpha Vantage API
        response = requests.get(url)
        data = response.json()
        
        # 處理 API 回應
        if "Time Series (5min)" in data:
            latest_data = list(data["Time Series (5min)"].values())[0]
            price = latest_data["1. open"]  # 取得最新的股市開盤價
            r.setex(cache_key, 60, price)  # 儲存到 Redis 並設定 60 秒過期
            return {"symbol": symbol, "price": price, "source": "api"}
        else:
            return {"error": "無法獲取股市資料，請稍後再試"}
        
    except requests.exceptions.RequestException as e:
        return {"error": f"請求錯誤：{e}"}