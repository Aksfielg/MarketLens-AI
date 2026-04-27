import yfinance as yf
from fastapi import APIRouter
from fastapi.responses import JSONResponse
import json
from datetime import datetime, timedelta
import redis
import os

router = APIRouter()

# Initialize Redis (Optional)
try:
    r = redis.from_url(os.getenv('REDIS_URL', 'redis://localhost:6379'), decode_responses=True)
    r.ping()  # Test connection
except Exception:
    r = None
    print("Warning: Redis not available. Running without cache.")

NSE_STOCKS = {
  'RELIANCE': 'RELIANCE.NS', 'HDFCBANK': 'HDFCBANK.NS', 'TCS': 'TCS.NS',
  'INFY': 'INFY.NS', 'TATAMOTORS': 'TATAMOTORS.NS', 'BAJFINANCE': 'BAJFINANCE.NS',
  'WIPRO': 'WIPRO.NS', 'ICICIBANK': 'ICICIBANK.NS', 'SUNPHARMA': 'SUNPHARMA.NS',
  'MARUTI': 'MARUTI.NS', 'HINDUNILVR': 'HINDUNILVR.NS', 'KOTAKBANK': 'KOTAKBANK.NS',
  'LT': 'LT.NS', 'NTPC': 'NTPC.NS', 'ONGC': 'ONGC.NS', 'AXISBANK': 'AXISBANK.NS',
  'SBIN': 'SBIN.NS', 'DRREDDY': 'DRREDDY.NS', 'BHARTIARTL': 'BHARTIARTL.NS',
  'ASIANPAINT': 'ASIANPAINT.NS'
}

@router.get("/api/stock-price/{symbol}")
async def get_stock_price(symbol: str):
    cache_key = f"price:{symbol}"
    
    if r:
        try:
            cached = r.get(cache_key)
            if cached:
                return JSONResponse(json.loads(cached))
        except Exception:
            pass
    
    ticker_symbol = NSE_STOCKS.get(symbol, f"{symbol}.NS")
    try:
        ticker = yf.Ticker(ticker_symbol)
        hist = ticker.history(period="5d")
        hist = hist.dropna(subset=['Close'])
        if hist.empty:
            return JSONResponse({"error": "No data"}, status_code=404)
        
        latest = hist.iloc[-1]
        prev = hist.iloc[-2] if len(hist) > 1 else hist.iloc[-1]
        
        price = round(float(latest['Close']), 2)
        prev_price = round(float(prev['Close']), 2)
        change_pct = round(((price - prev_price) / prev_price) * 100, 2)
        change_abs = round(price - prev_price, 2)
        
        result = {
            "symbol": symbol,
            "price": price,
            "change_pct": change_pct,
            "change_abs": change_abs,
            "high": round(float(latest['High']), 2),
            "low": round(float(latest['Low']), 2),
            "volume": int(latest['Volume']),
            "date": str(hist.index[-1].date())
        }
        
        if r:
            try:
                r.setex(cache_key, 900, json.dumps(result))  # 15 min cache
            except Exception:
                pass
                
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/api/stock-history/{symbol}")
async def get_stock_history(symbol: str, period: str = "1mo"):
    cache_key = f"history:{symbol}:{period}"
    
    if r:
        try:
            cached = r.get(cache_key)
            if cached:
                return JSONResponse(json.loads(cached))
        except Exception:
            pass
    
    period_map = {"1w": "5d", "1m": "1mo", "3m": "3mo", "6m": "6mo"}
    yf_period = period_map.get(period, "1mo")
    ticker_symbol = NSE_STOCKS.get(symbol, f"{symbol}.NS")
    
    try:
        ticker = yf.Ticker(ticker_symbol)
        hist = ticker.history(period=yf_period)
        hist = hist.dropna(subset=['Close'])
        
        candles = []
        for date, row in hist.iterrows():
            candles.append({
                "date": str(date.date()),
                "open": round(float(row['Open']), 2),
                "high": round(float(row['High']), 2),
                "low": round(float(row['Low']), 2),
                "close": round(float(row['Close']), 2),
                "volume": int(row['Volume'])
            })
        
        result = {"symbol": symbol, "period": period, "candles": candles}
        
        if r:
            try:
                r.setex(cache_key, 3600, json.dumps(result))  # 1 hr cache
            except Exception:
                pass
                
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
