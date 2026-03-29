import os
import pandas as pd
import numpy as np
import pandas_ta as ta
from scipy.signal import find_peaks
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

class PatternDetector:
    def __init__(self):
        # We assume the raw data CSVs are in backend/data/raw
        self.data_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')

    def load_data(self, symbol: str) -> pd.DataFrame:
        """Loads CSV from data/raw/{symbol}.csv into a pandas DataFrame."""
        file_path = os.path.join(self.data_dir, f"{symbol}.csv")
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Data file for {symbol} not found at {file_path}")
        
        df = pd.read_csv(file_path)
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
            df = df.sort_values('date').reset_index(drop=True)
        return df

    def calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculates and adds technical indicators to the DataFrame using pandas_ta:
        - RSI (14-period)
        - MACD (12, 26, 9)
        - Bollinger Bands (20-period)
        - SMA 50 and SMA 200
        - Volume SMA 20
        """
        # We need a copy to avoid SettingWithCopy exceptions if we slice later
        df = df.copy()

        # Ensure required columns exist, mapping to standard names for pandas_ta if needed
        # Assuming the CSV has open, high, low, close, volume (all lowercase from our fetch script)
        # pandas_ta mostly works with whatever you pass, but we must use the correct column names.
        
        close_col = 'close' if 'close' in df.columns else 'Close'
        high_col = 'high' if 'high' in df.columns else 'High'
        low_col = 'low' if 'low' in df.columns else 'Low'
        vol_col = 'volume' if 'volume' in df.columns else 'Volume'

        # RSI
        df.ta.rsi(close=close_col, length=14, append=True)
        
        # MACD
        df.ta.macd(close=close_col, fast=12, slow=26, signal=9, append=True)
        
        # Bollinger Bands
        df.ta.bbands(close=close_col, length=20, append=True)
        
        # SMAs
        df.ta.sma(close=close_col, length=50, append=True)
        df.ta.sma(close=close_col, length=200, append=True)
        
        # Volume SMA
        df['volume_sma20'] = df[vol_col].rolling(window=20).mean()

        # Standardize MACD output names to simpler forms for ease of use
        # pandas_ta appends something like MACD_12_26_9, MACDh_12_26_9, MACDs_12_26_9
        # Let's map them to make it easier for detection functions
        for col in df.columns:
            if col.startswith("MACD_"):
                df['MACD_line'] = df[col]
            elif col.startswith("MACDs_"):
                df['MACD_signal'] = df[col]
            elif col.startswith("MACDh_"):
                df['MACD_hist'] = df[col]
            elif col.startswith("RSI_"):
                df['RSI'] = df[col]
            elif col.startswith("SMA_50"):
                df['SMA_50'] = df[col]
            elif col.startswith("SMA_200"):
                df['SMA_200'] = df[col]

        return df

    def detect_rsi_divergence(self, df: pd.DataFrame) -> dict:
        """
        Detect bullish RSI divergence:
        - Price makes lower low BUT RSI makes higher low
        - Uses scipy.signal.find_peaks to find price lows
        """
        result = {"detected": False, "date": None, "price": None, "rsi": None, "strength": 0.0, "type": "RSI Divergence"}
        
        if df is None or len(df) < 50 or 'RSI' not in df.columns:
            return result

        low_col = 'low' if 'low' in df.columns else 'Low'
        date_col = 'date' if 'date' in df.columns else 'Date'
        
        # To find lows, we invert the low prices
        inverted_lows = -df[low_col].values
        
        # Find peaks of inverted prices -> these are the valleys/lows
        # distance specifies minimum number of days between lows
        peaks, _ = find_peaks(inverted_lows, distance=10)
        
        if len(peaks) >= 2:
            # We look at the last two significant lows
            idx_low1 = peaks[-2]
            idx_low2 = peaks[-1]
            
            price1 = df[low_col].iloc[idx_low1]
            price2 = df[low_col].iloc[idx_low2]
            
            rsi1 = df['RSI'].iloc[idx_low1]
            rsi2 = df['RSI'].iloc[idx_low2]
            
            # Check for bullish divergence: Lower low in price, higher low in RSI
            if price2 < price1 and rsi2 > rsi1:
                # Extra check: ensure we are reasonably close to the present day
                # Only signal if the second low is within the last 15 days
                if (len(df) - 1) - idx_low2 <= 15:
                    result["detected"] = True
                    result["date"] = df[date_col].iloc[idx_low2].strftime('%Y-%m-%d')
                    result["price"] = float(price2)
                    result["rsi"] = float(rsi2)
                    # Strength calculation: difference in RSI points
                    result["strength"] = float(rsi2 - rsi1)

        return result

    def detect_macd_crossover(self, df: pd.DataFrame) -> dict:
        """
        Detect bullish MACD crossover:
        - MACD line crosses above signal line
        - Check last 3 days for fresh crossover
        """
        result = {"detected": False, "date": None, "price": None, "macd": None, "strength": 0.0, "type": "MACD Crossover"}
        
        if df is None or len(df) < 30 or 'MACD_line' not in df.columns or 'MACD_signal' not in df.columns:
            return result
        
        close_col = 'close' if 'close' in df.columns else 'Close'
        date_col = 'date' if 'date' in df.columns else 'Date'
        
        # Check last 3 days for a crossover
        # A crossover means MACD line goes from below to above the signal line
        last_days = df.tail(4).reset_index(drop=True)
        
        for i in range(1, len(last_days)):
            prev_macd = last_days['MACD_line'].iloc[i-1]
            prev_signal = last_days['MACD_signal'].iloc[i-1]
            
            curr_macd = last_days['MACD_line'].iloc[i]
            curr_signal = last_days['MACD_signal'].iloc[i]
            
            # Bullish cross condition
            if prev_macd <= prev_signal and curr_macd > curr_signal:
                # Fresh crossover detected
                result["detected"] = True
                result["date"] = last_days[date_col].iloc[i].strftime('%Y-%m-%d')
                result["price"] = float(last_days[close_col].iloc[i])
                result["macd"] = float(curr_macd)
                result["strength"] = float(curr_macd - curr_signal)
                # Keep looping to get the most recent crossover in the window
        
        return result

    def detect_double_bottom(self, df: pd.DataFrame) -> dict:
        """
        Detect double bottom pattern:
        - Two similar price lows within 20% of each other
        - Separated by 10-40 trading days
        - Second low has higher RSI (bullish divergence context)
        """
        result = {"detected": False, "date": None, "price": None, "rsi": None, "strength": 0.0, "type": "Double Bottom"}
        
        if df is None or len(df) < 50 or 'RSI' not in df.columns:
            return result

        low_col = 'low' if 'low' in df.columns else 'Low'
        date_col = 'date' if 'date' in df.columns else 'Date'
        
        inverted_lows = -df[low_col].values
        peaks, _ = find_peaks(inverted_lows, distance=5)
        
        if len(peaks) >= 2:
            # We need to iterate from newest peaks backwards to find latest occurrence
            # We look for pairs where peak distances and values make sense
            
            for i in range(len(peaks)-1, 0, -1):
                idx_low2 = peaks[i]
                price2 = df[low_col].iloc[idx_low2]
                rsi2 = df['RSI'].iloc[idx_low2]
                
                # Check recent relevance: if the latest bottom is more than 15 days ago, maybe ignore
                if i == len(peaks)-1 and (len(df)-1 - idx_low2 > 15):
                    continue

                for j in range(i-1, -1, -1):
                    idx_low1 = peaks[j]
                    price1 = df[low_col].iloc[idx_low1]
                    rsi1 = df['RSI'].iloc[idx_low1]
                    
                    time_diff = idx_low2 - idx_low1
                    
                    if 10 <= time_diff <= 40:
                        # Price within 20% of each other (we use an absolute pct difference)
                        price_diff_pct = abs(price2 - price1) / price1
                        
                        if price_diff_pct <= 0.20:
                            # Second low has higher RSI
                            if rsi2 > rsi1:
                                result["detected"] = True
                                result["date"] = df[date_col].iloc[idx_low2].strftime('%Y-%m-%d')
                                result["price"] = float(price2)
                                result["rsi"] = float(rsi2)
                                result["strength"] = float(1.0 - price_diff_pct)  # 1.0 means perfect match
                                return result
                    elif time_diff > 40:
                        break # Too far back
                        
        return result

    def detect_breakout(self, df: pd.DataFrame) -> dict:
        """
        Detect breakout above resistance:
        - Find resistance level = highest high in last 20-50 days
        - Current price breaks above with 2%+ margin
        - Volume is 2x+ the 20-day average
        """
        result = {"detected": False, "resistance_level": None, "breakout_price": None, "volume_ratio": None, "type": "Breakout"}
        
        if df is None or len(df) < 50 or 'volume_sma20' not in df.columns:
            return result

        high_col = 'high' if 'high' in df.columns else 'High'
        close_col = 'close' if 'close' in df.columns else 'Close'
        vol_col = 'volume' if 'volume' in df.columns else 'Volume'
        
        # Focus on the most recent day for breakout tests
        curr_idx = len(df) - 1
        curr_close = df[close_col].iloc[curr_idx]
        curr_vol = df[vol_col].iloc[curr_idx]
        vol_sma20 = df['volume_sma20'].iloc[curr_idx]
        
        # Consider a 50-day window excluding the last 1 day for finding historical resistance
        window_start = max(0, curr_idx - 50)
        window_end = max(0, curr_idx - 1)
        
        if window_start >= window_end:
            return result
            
        historical_high = df[high_col].iloc[window_start:window_end].max()
        
        # Margin above resistance = (price - resistance) / resistance
        margin = (curr_close - historical_high) / historical_high
        
        if pd.isna(margin) or pd.isna(vol_sma20) or vol_sma20 == 0:
            return result
            
        vol_ratio = curr_vol / vol_sma20
        
        # Breakout if price is 2%+ above historical high and vol is 2x+
        if margin >= 0.02 and vol_ratio >= 2.0:
            result["detected"] = True
            result["resistance_level"] = float(historical_high)
            result["breakout_price"] = float(curr_close)
            result["volume_ratio"] = float(vol_ratio)
            
        return result

    def detect_golden_cross(self, df: pd.DataFrame) -> dict:
        """
        Detect Golden Cross:
        - SMA 50 crosses above SMA 200
        """
        result = {"detected": False, "date": None, "price": None, "type": "Golden Cross"}
        
        if df is None or len(df) < 200 or 'SMA_50' not in df.columns or 'SMA_200' not in df.columns:
            return result

        close_col = 'close' if 'close' in df.columns else 'Close'
        date_col = 'date' if 'date' in df.columns else 'Date'
        
        # Check last 5 days
        last_days = df.tail(6).reset_index(drop=True)
        
        for i in range(1, len(last_days)):
            prev_50 = last_days['SMA_50'].iloc[i-1]
            prev_200 = last_days['SMA_200'].iloc[i-1]
            
            curr_50 = last_days['SMA_50'].iloc[i]
            curr_200 = last_days['SMA_200'].iloc[i]
            
            if pd.isna(prev_50) or pd.isna(prev_200) or pd.isna(curr_50) or pd.isna(curr_200):
                continue
                
            if prev_50 <= prev_200 and curr_50 > curr_200:
                result["detected"] = True
                result["date"] = last_days[date_col].iloc[i].strftime('%Y-%m-%d')
                result["price"] = float(last_days[close_col].iloc[i])
        
        return result

    def scan_all_patterns(self, symbol: str) -> dict:
        """
        Runs all 5 detectors and returns combined results.
        Returns a dictionary mapping pattern names to their dictionaries.
        """
        results = {
            "symbol": symbol,
            "patterns": {
                "rsi_divergence": {"detected": False},
                "macd_crossover": {"detected": False},
                "double_bottom": {"detected": False},
                "breakout": {"detected": False},
                "golden_cross": {"detected": False}
            }
        }
        
        try:
            df = self.load_data(symbol)
            if df.empty:
                return results
                
            df = self.calculate_indicators(df)
            
            results["patterns"]["rsi_divergence"] = self.detect_rsi_divergence(df)
            results["patterns"]["macd_crossover"] = self.detect_macd_crossover(df)
            results["patterns"]["double_bottom"] = self.detect_double_bottom(df)
            results["patterns"]["breakout"] = self.detect_breakout(df)
            results["patterns"]["golden_cross"] = self.detect_golden_cross(df)
            
        except FileNotFoundError:
            print(f"File not found for {symbol}. Run data fetcher first.")
        except Exception as e:
            print(f"Error scanning patterns for {symbol}: {e}")
            
        return results

if __name__ == "__main__":
    detector = PatternDetector()
    try:
        results = detector.scan_all_patterns("RELIANCE")
        print("\nResults for RELIANCE:")
        for pattern, res in results["patterns"].items():
            if res.get("detected"):
                print(f"✅ {pattern.replace('_', ' ').title()}: {res}")
            else:
                print(f"❌ {pattern.replace('_', ' ').title()} not active")
    except Exception as e:
        print(f"Test run failed: {e}")
