import redis
import os
from dotenv import load_dotenv

# 載入 .env 環境變數
load_dotenv()

# 讀取 Redis URL 和 Token
REDIS_URL = os.getenv("UPSTASH_REDIS_REST_URL")
REDIS_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN")

# 使用 Upstash 提供的 Redis 連線設定
try:
    r = redis.Redis.from_url(REDIS_URL, password=REDIS_TOKEN)

    # 測試 Redis 是否正常運行
    response = r.ping()  # PING 是 Redis 的一個簡單命令，用來檢查是否能成功連接
    if response:
        print("Redis 連線成功！")
except redis.exceptions.ConnectionError as e:
    print(f"Redis 連線失敗: {e}")