import os
import sys
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from scipy.signal import find_peaks

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.patterns.detector import PatternDetector
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")

class Backtester:
    def __init__(self):
        if not DATABASE_URL:
            raise ValueError("DATABASE_URL not found in environment variables")
        self.engine = create_engine(DATABASE_URL)
        self.detector = PatternDetector()

    def backtest_pattern(self, symbol: str, pattern_type: str, lookback_years=2, forward_days=20, save_to_db=True):
        # 1. Load Data
        try:
            df = self.detector.load_data(symbol)
        except FileNotFoundError:
            print(f"Data for {symbol} not found.")
            return None
            
        if df.empty or len(df) < 50:
            print(f"Not enough data for {symbol}.")
            return None
            
        # Calculate indicators
        df = self.detector.calculate_indicators(df)
        
        # 2. Vectorized Pattern Detection across all history
        signals = pd.Series(False, index=df.index)
        
        if pattern_type == "Golden Cross":
            if 'SMA_50' in df.columns and 'SMA_200' in df.columns:
                prev_50 = df['SMA_50'].shift(1)
                prev_200 = df['SMA_200'].shift(1)
                curr_50 = df['SMA_50']
                curr_200 = df['SMA_200']
                signals = (prev_50 <= prev_200) & (curr_50 > curr_200)

        elif pattern_type == "MACD Crossover":
            if 'MACD_line' in df.columns and 'MACD_signal' in df.columns:
                prev_macd = df['MACD_line'].shift(1)
                prev_sig = df['MACD_signal'].shift(1)
                curr_macd = df['MACD_line']
                curr_sig = df['MACD_signal']
                signals = (prev_macd <= prev_sig) & (curr_macd > curr_sig)

        elif pattern_type == "Breakout":
            if 'high' in df.columns and 'close' in df.columns and 'volume' in df.columns and 'volume_sma20' in df.columns:
                # Rolling 50-day high excluding today
                historical_high = df['high'].shift(1).rolling(window=50, min_periods=20).max()
                margin = (df['close'] - historical_high) / historical_high
                vol_ratio = df['volume'] / df['volume_sma20']
                
                signals = (margin >= 0.02) & (vol_ratio >= 2.0)

        elif pattern_type == "RSI Divergence":
            if 'low' in df.columns and 'RSI' in df.columns:
                # Find all peaks on inverted prices to find valleys
                inverted_lows = -df['low'].values
                peaks, _ = find_peaks(inverted_lows, distance=10)
                
                for i in range(1, len(peaks)):
                    idx1 = peaks[i-1]
                    idx2 = peaks[i]
                    
                    price1 = df['low'].iloc[idx1]
                    price2 = df['low'].iloc[idx2]
                    rsi1 = df['RSI'].iloc[idx1]
                    rsi2 = df['RSI'].iloc[idx2]
                    
                    if price2 < price1 and rsi2 > rsi1:
                        signals.iloc[idx2] = True

        elif pattern_type == "Double Bottom":
            if 'low' in df.columns and 'RSI' in df.columns:
                inverted_lows = -df['low'].values
                peaks, _ = find_peaks(inverted_lows, distance=5)
                
                for i in range(1, len(peaks)):
                    idx2 = peaks[i]
                    price2 = df['low'].iloc[idx2]
                    rsi2 = df['RSI'].iloc[idx2]
                    
                    # Look backwards to find matching bottom
                    for j in range(i-1, -1, -1):
                        idx1 = peaks[j]
                        time_diff = idx2 - idx1
                        
                        if 10 <= time_diff <= 40:
                            price1 = df['low'].iloc[idx1]
                            rsi1 = df['RSI'].iloc[idx1]
                            price_diff_pct = abs(price2 - price1) / price1
                            
                            if price_diff_pct <= 0.20 and rsi2 > rsi1:
                                signals.iloc[idx2] = True
                                break # Only flag the earliest valid bottom formation
                        elif time_diff > 40:
                            break
                            
        # 3. Compute Forward Returns Vectorized
        df['forward_close'] = df['close'].shift(-forward_days)
        df['forward_return'] = (df['forward_close'] - df['close']) / df['close'] * 100
        
        # Filter for days where the signal fired AND we have a valid forward return
        occ_df = df[signals & df['forward_return'].notna()]
        
        # 4. Calculate Stats
        total_occurrences = len(occ_df)
        
        if total_occurrences == 0:
            stats = {
                "symbol": symbol,
                "pattern_type": pattern_type,
                "occurrences": 0,
                "win_rate": 0.0,
                "avg_return": 0.0,
                "best_return": 0.0,
                "worst_return": 0.0
            }
        else:
            wins = len(occ_df[occ_df['forward_return'] > 2.0])
            losses = len(occ_df[occ_df['forward_return'] < -2.0])
            total_resolved = wins + losses
            
            win_rate = (wins / total_resolved * 100) if total_resolved > 0 else 0.0
            avg_return = occ_df['forward_return'].mean()
            best_return = occ_df['forward_return'].max()
            worst_return = occ_df['forward_return'].min()
            
            stats = {
                "symbol": symbol,
                "pattern_type": pattern_type,
                "occurrences": int(total_occurrences),
                "win_rate": float(win_rate),
                "avg_return": float(avg_return),
                "best_return": float(best_return),
                "worst_return": float(worst_return)
            }
            
        print(f"{symbol} - {pattern_type}: Found {stats['occurrences']} occurrences in {lookback_years} years. Win rate: {round(stats['win_rate'])}%, Avg return: {round(stats['avg_return'], 1):+}% in {forward_days} days")
        
        # 6. Save to database conditionally
        if save_to_db:
            self._save_to_db(stats)
            
        return stats
        
    def _save_to_db(self, stats):
        # We use an upsert/conflict approach or just insert
        # The schema doesn't have a unique constraint, but we can just insert
        insert_stmt = text("""
            INSERT INTO backtest_results (symbol, pattern_type, occurrences, win_rate, avg_return)
            VALUES (:symbol, :pattern_type, :occurrences, :win_rate, :avg_return)
        """)
        try:
            with self.engine.begin() as conn:
                conn.execute(insert_stmt, {
                    "symbol": stats["symbol"],
                    "pattern_type": stats["pattern_type"],
                    "occurrences": stats["occurrences"],
                    "win_rate": stats["win_rate"],
                    "avg_return": stats["avg_return"]
                })
        except Exception as e:
            print(f"Error saving to DB: {e}")

if __name__ == "__main__":
    bt = Backtester()
    print("--- Running Backtests ---")
    bt.backtest_pattern("RELIANCE", "RSI Divergence")
    bt.backtest_pattern("HDFCBANK", "Double Bottom")
    bt.backtest_pattern("TCS", "MACD Crossover")
    bt.backtest_pattern("INFY", "Breakout")
    bt.backtest_pattern("SBIN", "Golden Cross")
