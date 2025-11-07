import os, time, redis
from dotenv import load_dotenv
load_dotenv()
r = redis.Redis.from_url(os.getenv("UPSTASH_REDIS_REST_URL"),
                         password=os.getenv("UPSTASH_REDIS_REST_TOKEN"))
key = "keepalive:portora"
value = str(int(time.time()))
r.setex(key, 3600, value)  # 設 1 小時過期，也足夠算活躍
print("OK keepalive ->", key, value)
print("GET ->", r.get(key).decode())