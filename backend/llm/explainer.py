import os
import json
import redis
import warnings
warnings.filterwarnings("ignore")

from google import genai as google_genai
from dotenv import load_dotenv

# Ensure we load from the absolute top-level .env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

# Connect to Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
    redis_client.ping()
    REDIS_OK = True
    print("[Explainer] Redis connected OK.")
except Exception:
    redis_client = None
    REDIS_OK = False
    print("[Explainer] Redis not available — caching disabled.")

# Configure Gemini client (new google-genai SDK)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_client = None
if GEMINI_API_KEY:
    gemini_client = google_genai.Client(api_key=GEMINI_API_KEY)
    print("[Explainer] Gemini client initialized.")
else:
    print("[Explainer] WARNING: GEMINI_API_KEY not found in .env!")


def generate_explanation(signal_data: dict, backtest_data: dict) -> dict:
    """
    Generates an explanation using Gemini 2.0 Flash of a detected stock pattern
    and caches the result cleanly to Redis for 24 hours to save API calls.
    """
    symbol       = signal_data.get("symbol", "UNKNOWN")
    pattern_type = signal_data.get("pattern", signal_data.get("pattern_type", "Pattern"))
    date         = signal_data.get("detected_date", signal_data.get("date", "Today"))
    price        = signal_data.get("key_price", signal_data.get("price", "0.00"))
    company_name = signal_data.get("company_name", symbol)
    rsi_value    = signal_data.get("rsi_value", signal_data.get("rsi", "N/A"))
    volume_ratio = signal_data.get("volume_ratio", "N/A")
    support      = signal_data.get("support", price)
    resistance   = signal_data.get("resistance", price)

    occurrences  = backtest_data.get("occurrences", 0)
    win_rate     = backtest_data.get("win_rate", 0.0)
    avg_return   = backtest_data.get("avg_return", 0.0)

    # 1. Check Redis cache
    cache_key = f"explanation:{symbol}:{pattern_type}:{date}"
    if REDIS_OK and redis_client:
        try:
            cached = redis_client.get(cache_key)
            if cached:
                print(f"[Explainer] Cache HIT for {cache_key}")
                return json.loads(cached)
        except Exception as e:
            print(f"[Explainer] Redis read error: {e}")

    # 2. Build prompt
    prompt = f"""You are a financial analyst explaining stock signals to a retail investor in India. Be concise, clear, and always mention the historical success rate. Never give direct buy/sell advice. Always mention risk.

Stock: {symbol} ({company_name})
Pattern Detected: {pattern_type} on {date}
Current Price: ₹{price}
Key Technical Levels: Support at ₹{support}, Resistance at ₹{resistance}
RSI: {rsi_value} (oversold = below 30, overbought = above 70)
Volume: {volume_ratio}x the 20-day average
Historical Performance: This exact pattern appeared {occurrences} times on {symbol} in the last 2 years. Win rate: {win_rate}%. Average return in 20 days: {avg_return}%.

Write a 3-sentence explanation a beginner can understand, then 1 sentence of risk warning. Return ONLY a valid JSON object with the exact keys: "explanation" (string), "action_signal" (string: "Watch carefully" / "Consider entry" / "Avoid"), and "risk_level" (string: "Low"/"Medium"/"High"). Do not wrap it in markdown blocks like ```json."""

    # Determine action signal from win rate for data-rich fallback
    if win_rate >= 65:
        fallback_action = "Consider entry"
        fallback_risk = "Medium"
    elif win_rate >= 50:
        fallback_action = "Watch carefully"
        fallback_risk = "Medium"
    else:
        fallback_action = "Avoid"
        fallback_risk = "High"

    fallback = {
        "explanation": (
            f"A {pattern_type} pattern has been detected on {symbol} at ₹{price}. "
            f"Based on {occurrences} historical occurrences over the last 2 years, this pattern had a "
            f"{win_rate:.1f}% win rate with an average 20-day return of {avg_return:+.1f}%. "
            f"Volume and RSI conditions support this signal. "
            f"Risk warning: Past performance does not guarantee future results — always use a stop-loss and consult a SEBI-registered advisor."
        ),
        "action_signal": fallback_action,
        "risk_level": fallback_risk
    }

    # 3. Call Gemini API
    if not gemini_client:
        print("[Explainer] No Gemini client — returning fallback.")
        return fallback

    # Try model chain with exponential backoff: gemini-2.0-flash -> gemini-1.5-flash-8b
    MODELS_TO_TRY = ["gemini-2.0-flash", "gemini-1.5-flash-8b"]
    MAX_RETRIES = 3
    response = None

    for model_name in MODELS_TO_TRY:
        for attempt in range(MAX_RETRIES):
            try:
                print(f"[Explainer] Attempt {attempt+1}/{MAX_RETRIES} — Calling {model_name}...")
                response = gemini_client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                print(f"[Explainer] SUCCESS with {model_name}")
                break  # Break inner retry loop on success
            except Exception as model_err:
                err_str = str(model_err)
                is_rate_limit = "429" in err_str or "RESOURCE_EXHAUSTED" in err_str
                if is_rate_limit and attempt < MAX_RETRIES - 1:
                    wait_secs = 2 ** (attempt + 1)  # 2, 4, 8 seconds
                    print(f"[Explainer] 429 Rate limit hit. Retrying in {wait_secs}s...")
                    import time; time.sleep(wait_secs)
                else:
                    print(f"[Explainer] {model_name} failed after {attempt+1} attempt(s): {str(model_err)[:120]}")
                    response = None
                    break  # Give up on this model, try next

        if response is not None:
            break  # Break outer model loop on success

    if response is None:
        print("[Explainer] All Gemini models/retries exhausted. Returning data-rich template fallback.")
        return fallback


    try:
        # DEBUG: print raw response so you can see exactly what Gemini returned
        print(f"[Explainer] RAW Gemini response:\n{response.text}\n")

        text = response.text.strip()

        # 4. Strip accidental markdown fences
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        parsed = json.loads(text)

        # Validate required keys
        required = {"explanation", "action_signal", "risk_level"}
        if not required.issubset(parsed.keys()):
            raise KeyError(f"Missing keys in LLM response. Got: {list(parsed.keys())}")

        # Save to Redis with 24-hour TTL
        if REDIS_OK and redis_client:
            try:
                redis_client.setex(cache_key, 86400, json.dumps(parsed))
                print(f"[Explainer] Cached result under key: {cache_key}")
            except Exception as e:
                print(f"[Explainer] Redis write error: {e}")

        return parsed

    except Exception as e:
        print(f"[Explainer] JSON parse/validation failed: {type(e).__name__}: {e}")
        return fallback


if __name__ == "__main__":
    dummy_signal = {
        "symbol": "MUTHOOTFIN",
        "pattern": "Double Bottom",
        "key_price": 2100.50,
        "detected_date": "2026-03-27"
    }
    dummy_bt = {"occurrences": 8, "win_rate": 62.5, "avg_return": 5.1}
    print("\n=== Testing explainer for MUTHOOTFIN / Double Bottom ===\n")
    result = generate_explanation(dummy_signal, dummy_bt)
    print("\n=== Final Result ===")
    print(json.dumps(result, indent=2))
