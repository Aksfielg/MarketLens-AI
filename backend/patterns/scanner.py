import os
import sys
import json
import datetime
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# We need to import NSE_SYMBOLS from fetch_nse_data
# We'll just append backend path to sys.path to easily import it
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from backend.data.fetch_nse_data import NSE_SYMBOLS
from backend.patterns.detector import PatternDetector

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables")

def init_db():
    return create_engine(DATABASE_URL)

def calculate_rsi_position(rsi_value):
    if pd.isna(rsi_value):
        return 0.0
    if rsi_value < 30:
        return 1.0
    elif 30 <= rsi_value <= 40:
        return 0.8
    elif 40 < rsi_value <= 60:
        return 0.5
    else:
        return 0.0

def run_scanner():
    detector = PatternDetector()
    all_signals = []
    
    print(f"Scanning {len(NSE_SYMBOLS)} symbols for patterns...")
    
    for symbol in NSE_SYMBOLS:
        try:
            # We need to load and calculate indicators first to get the current day's data
            df = detector.load_data(symbol)
            if df.empty or len(df) < 200:
                continue
                
            df = detector.calculate_indicators(df)
            
            # Run scan
            scan_results = detector.scan_all_patterns(symbol)
            patterns_found = scan_results.get("patterns", {})
            
            # Get latest day values for scoring
            last_row = df.iloc[-1]
            current_date = last_row['date'].strftime('%Y-%m-%d') if 'date' in last_row else datetime.datetime.now().strftime('%Y-%m-%d')
            
            # Calculate volume ratio
            vol = last_row.get('volume', last_row.get('Volume', 0))
            vol_sma20 = last_row.get('volume_sma20', 1)
            vol_ratio = vol / vol_sma20 if vol_sma20 and not pd.isna(vol_sma20) and vol_sma20 > 0 else 1.0
            
            # Clamp vol_ratio to max 3.0 for scoring purposes, but scale it so peak is 1.0
            scoring_vol_ratio = min(1.0, vol_ratio / 2.0)
            
            # RSI position
            rsi = last_row.get('RSI', 50)
            rsi_position = calculate_rsi_position(rsi)
            
            # Trend alignment
            sma200 = last_row.get('SMA_200', float('inf'))
            close_price = last_row.get('close', last_row.get('Close', 0))
            trend_alignment = 1.0 if close_price > sma200 else 0.0
            
            for pat_key, pat_data in patterns_found.items():
                if pat_data and pat_data.get("detected"):
                    pat_type = pat_data.get("type", pat_key)
                    
                    # Determine pattern strength (0 to 1)
                    pattern_strength = 0.5
                    if "strength" in pat_data:
                        raw_str = pat_data["strength"]
                        if pat_type == "RSI Divergence":
                            pattern_strength = min(1.0, abs(raw_str) / 10.0)
                        elif pat_type == "Double Bottom":
                            pattern_strength = min(1.0, max(0.0, raw_str))
                        elif pat_type == "MACD Crossover":
                            pattern_strength = 0.8
                    elif pat_type == "Breakout":
                        # Stronger breakouts get higher strength up to 1.0
                        b_vol_ratio = pat_data.get("volume_ratio", 2.0)
                        pattern_strength = min(1.0, b_vol_ratio / 4.0)
                    elif pat_type == "Golden Cross":
                        pattern_strength = 0.9

                    # Calculate formula
                    conviction_score = (
                        pattern_strength * 0.4 +
                        scoring_vol_ratio * 0.3 +
                        rsi_position * 0.2 +
                        trend_alignment * 0.1
                    ) * 100
                    
                    # Extract key price safely
                    key_price = pat_data.get("price") or pat_data.get("breakout_price") or close_price
                    detected_date = pat_data.get("date") or current_date
                    
                    signal = {
                        "symbol": symbol,
                        "pattern": pat_type,
                        "conviction_score": round(conviction_score, 2),
                        "key_price": float(key_price),
                        "signal_type": "bullish", # Currently all implemented are bullish
                        "detected_date": detected_date,
                        "description": f"Detected {pat_type} pattern with {round(conviction_score, 1)}% conviction."
                    }
                    all_signals.append(signal)

        except Exception as e:
            print(f"Error scanning {symbol}: {e}")
            continue

    # 6. Sort all signals by conviction_score descending
    all_signals.sort(key=lambda x: x["conviction_score"], reverse=True)
    
    # 7. Save top 20 signals to database patterns table
    top_20 = all_signals[:20]
    
    if top_20:
        engine = init_db()
        
        # We prepare records for the DB based on the database schema
        # schema: symbol, pattern_type, detected_date, key_price, conviction_score, description
        db_records = []
        for s in top_20:
            db_records.append({
                "symbol": s["symbol"],
                "pattern_type": s["pattern"],
                "detected_date": s["detected_date"],
                "key_price": float(s["key_price"]),
                "conviction_score": float(s["conviction_score"]),
                "description": str(s["description"])
            })
            
        insert_stmt = text("""
            INSERT INTO patterns (symbol, pattern_type, detected_date, key_price, conviction_score, description)
            VALUES (:symbol, :pattern_type, :detected_date, :key_price, :conviction_score, :description)
        """)
        
        with engine.begin() as conn:
            conn.execute(insert_stmt, db_records)
            
        print(f"\nSaved {len(top_20)} signals to the database.")

    # 8. Also save to a JSON file: backend/data/daily_signals.json
    today_str = datetime.datetime.now().strftime('%Y-%m-%d')
    
    json_output = {
        "date": today_str,
        "signals": []
    }
    
    # The JSON schema specifically wants pattern to be exactly the JSON structure requested
    for s in all_signals:
        json_output["signals"].append({
            "symbol": s["symbol"],
            "pattern": s["pattern"],
            "conviction_score": s["conviction_score"],
            "key_price": s["key_price"],
            "signal_type": s["signal_type"]
        })
        
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    os.makedirs(data_dir, exist_ok=True)
    json_path = os.path.join(data_dir, 'daily_signals.json')
    
    with open(json_path, 'w') as f:
        json.dump(json_output, f, indent=2)
        
    print(f"Saved {len(all_signals)} total signals to {json_path}")

    # 9. Print the top 10 signals with their scores
    print("\n--- TOP 10 BULLISH SIGNALS ---")
    for i, s in enumerate(all_signals[:10], 1):
        print(f"{i}. {s['symbol'].ljust(15)} | {s['pattern'].ljust(20)} | Score: {s['conviction_score']}% | Price: {s['key_price']}")

if __name__ == "__main__":
    run_scanner()
