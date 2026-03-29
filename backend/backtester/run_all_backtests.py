import sys
import os

# Add project root to path so we can import modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.backtester.backtest import Backtester
from backend.data.fetch_nse_data import NSE_SYMBOLS
from sqlalchemy import text

def run_all_tests():
    print("--- Starting Full Backtest Suite ---\n")
    
    bt = Backtester()
    
    # Clear the table first to avoid accumulating duplicate backtest rows if run multiple times
    # This is an optional but good practice for a mass run script like this
    try:
        with bt.engine.begin() as conn:
            conn.execute(text("TRUNCATE TABLE backtest_results"))
        print("Cleared previous backtest results from table.")
    except Exception as e:
        print(f"Failed to truncate table: {e}")
    
    # As requested by user: Take top 50 stocks for speed
    top_50_symbols = NSE_SYMBOLS[:50]
    
    patterns_to_test = [
        "RSI Divergence", 
        "MACD Crossover", 
        "Double Bottom", 
        "Breakout", 
        "Golden Cross"
    ]
    
    all_results = []
    
    # 2. For each symbol in top 50 stocks (subset for speed):
    for symbol in top_50_symbols:
        print(f"\nAnalyzed {symbol}... ")
        for pattern in patterns_to_test:
            try:
                # Run backtest, intercept saving so we can filter mathematically
                result = bt.backtest_pattern(symbol, pattern, save_to_db=False)
                
                if result:
                    # if total_occurrences >= 3: only save if enough data
                    if result.get("occurrences", 0) >= 3:
                        bt._save_to_db(result)
                        all_results.append(result)
            except Exception as e:
                print(f"Error checking {pattern} on {symbol}: {e}")

    print("\n--- Backtest Suite Completed ---\n")
    
    # 3. Print a leaderboard at the end
    print("Top 10 most reliable patterns across all stocks:")
    if not all_results:
        print("No reliable patterns found.")
        return
        
    # Sorted by win_rate descending
    sorted_results = sorted(all_results, key=lambda x: x["win_rate"], reverse=True)
    
    header_fmt = "{:<15} | {:<16} | {:<9} | {:<10} | {:<12}"
    print(header_fmt.format("SYMBOL", "PATTERN", "WIN RATE", "AVG RETURN", "OCCURRENCES"))
    print("-" * 75)
    
    for res in sorted_results[:10]:
        win_str = f"{round(res['win_rate'])}%"
        ret_str = f"{round(res['avg_return'], 1):+}%"
        print(header_fmt.format(
            res['symbol'], 
            res['pattern_type'], 
            win_str, 
            ret_str, 
            res['occurrences']
        ))

if __name__ == "__main__":
    run_all_tests()
