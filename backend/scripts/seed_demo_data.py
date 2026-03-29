import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import date, timedelta
import random

from dotenv import load_dotenv

# Add the project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

from backend.api.dependencies import get_password_hash # Assuming you have this utility

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/marketlens")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

STOCKS = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HINDUNILVR", "SBIN", "BAJFINANCE", "BHARTIARTL", "KOTAKBANK", "WIPRO", "ASIANPAINT", "LT", "MARUTI", "ULTRACEMCO"]
PATTERNS = ["Bullish Engulfing", "RSI Divergence", "MACD Crossover", "Breakout", "Support Bounce"]

def seed_signals():
    db = SessionLocal()
    try:
        db.execute(text("DELETE FROM patterns;"))
        signals = []
        today = date.today()
        for _ in range(15):
            stock = random.choice(STOCKS)
            pattern = random.choice(PATTERNS)
            signals.append({
                "symbol": stock,
                "pattern_type": pattern,
                "detected_date": today,
                "key_price": round(random.uniform(1000, 4000), 2),
                "conviction_score": round(random.uniform(50, 100), 2),
                "description": f"A classic {pattern} pattern was detected for {stock}."
            })
        
        for signal in signals:
            db.execute(text("""
                INSERT INTO patterns (symbol, pattern_type, detected_date, key_price, conviction_score, description)
                VALUES (:symbol, :pattern_type, :detected_date, :key_price, :conviction_score, :description)
            """), signal)
        
        db.commit()
        print(f"🌱 Seeded {len(signals)} signals for today.")
    finally:
        db.close()

def seed_backtest_results():
    db = SessionLocal()
    try:
        db.execute(text("DELETE FROM backtest_results;"))
        results = []
        for stock in STOCKS[:10]:
            for pattern in PATTERNS:
                results.append({
                    "symbol": stock,
                    "pattern_type": pattern,
                    "occurrences": random.randint(5, 25),
                    "win_rate": round(random.uniform(55, 85), 2),
                    "avg_return": round(random.uniform(1.5, 7.5), 2)
                })
        
        for res in results:
            db.execute(text("""
                INSERT INTO backtest_results (symbol, pattern_type, occurrences, win_rate, avg_return)
                VALUES (:symbol, :pattern_type, :occurrences, :win_rate, :avg_return)
            """), res)
            
        db.commit()
        print(f"🌱 Seeded {len(results)} backtest results.")
    finally:
        db.close()

def seed_demo_user():
    db = SessionLocal()
    try:
        db.execute(text("DELETE FROM user_preferences WHERE email = 'demo@marketlens.ai';"))
        hashed_password = get_password_hash("Demo@123") # You need to implement this function
        
        # This is a simplified user creation. In your real app, you'd use your auth provider.
        # For Firebase, you'd create the user via the Firebase Admin SDK.
        # This SQL entry is just for the user_preferences table.
        
        db.execute(text("""
            INSERT INTO user_preferences (user_id, email, name, watchlist)
            VALUES (:user_id, :email, :name, :watchlist)
        """), {
            "user_id": "firebase_demo_user_id", # Replace with actual ID from Firebase
            "email": "demo@marketlens.ai",
            "name": "Demo User",
            "watchlist": ["RELIANCE", "TCS", "INFY"]
        })
        
        db.commit()
        print("🌱 Seeded demo user: demo@marketlens.ai / Demo@123")
    except Exception as e:
        print(f"Could not seed demo user. Make sure you have a `get_password_hash` function and have created the user in Firebase Admin first. Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Seeding demo data...")
    seed_signals()
    seed_backtest_results()
    # seed_demo_user() # Uncomment after setting up Firebase user creation
    print("✅ Demo data seeding complete.")
