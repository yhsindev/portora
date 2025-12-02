const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export async function fetchJSON(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

export const api = {
  quote: async (symbol) =>
    fetchJSON(`${BASE}/api/quote?symbol=${encodeURIComponent(symbol)}`),
  history: async (symbol, days = 120) =>
    fetchJSON(`${BASE}/api/history?symbol=${encodeURIComponent(symbol)}&days=${days}`),
  crypto: async (ids = "bitcoin", vs = "usd") =>
    fetchJSON(`${BASE}/api/crypto?ids=${encodeURIComponent(ids)}&vs=${encodeURIComponent(vs)}`),
};
