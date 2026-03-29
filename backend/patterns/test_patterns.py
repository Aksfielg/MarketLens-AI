import os
import sys

# Ensure backend package is in the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.patterns.detector import PatternDetector

def get_display_strength(pat_type, raw_strength, pat_data):
    """Normalize raw strength values to a 0-100 scale for consistent display."""
    if raw_strength is None:
        raw_strength = 50
        
    if pat_type == "RSI Divergence":
        # RSI diff typically 0-10
        return min(100, int(abs(raw_strength) * 10))
    elif pat_type == "Double Bottom":
        # Returns 0.8-1.0
        return min(100, int(max(0, raw_strength) * 100))
    elif pat_type == "Breakout":
        vol = pat_data.get("volume_ratio", 2.0)
        return min(100, int((vol / 4.0) * 100))
    elif pat_type == "MACD Crossover":
        return 80
    elif pat_type == "Golden Cross":
        return 90
    return 50

def main():
    test_symbols = ["RELIANCE", "HDFCBANK", "TCS", "INFY", "SBIN"]
    detector = PatternDetector()
    
    print("--- Pattern Detection Engine Test ---\n")
    
    for symbol in test_symbols:
        try:
            results = detector.scan_all_patterns(symbol)
            patterns = results.get("patterns", {})
            
            detected_any = False
            
            for pat_key, pat_data in patterns.items():
                if pat_data and pat_data.get("detected"):
                    detected_any = True
                    p_type = pat_data.get("type", pat_key)
                    date_str = pat_data.get("date", "Unknown")
                    
                    # Some patterns return 'breakout_price', others 'price'
                    price = pat_data.get("price")
                    if price is None:
                        price = pat_data.get("breakout_price", 0.0)
                        
                    raw_str = pat_data.get("strength")
                    strength_100 = get_display_strength(p_type, raw_str, pat_data)
                    
                    print(f"{symbol}: {p_type} DETECTED on {date_str} at price {round(float(price), 2)}. Strength: {strength_100}/100")
            
            if not detected_any:
                print(f"{symbol}: No patterns detected today")
                
        except Exception as e:
            print(f"{symbol}: Error running detection - {e}")

if __name__ == "__main__":
    main()
