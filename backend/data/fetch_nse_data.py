import os
import time
import pandas as pd
import yfinance as yf
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables")

# Ensure raw directory exists
RAW_DATA_DIR = os.path.join(os.path.dirname(__file__), 'raw')
os.makedirs(RAW_DATA_DIR, exist_ok=True)

NSE_SYMBOLS = [
  "RELIANCE", "HDFCBANK", "TCS", "INFY", "HINDUNILVR",
  "ICICIBANK", "KOTAKBANK", "BHARTIARTL", "ITC", "SBIN",
  "BAJFINANCE", "ASIANPAINT", "HCLTECH", "LT", "AXISBANK",
  "WIPRO", "MARUTI", "ULTRACEMCO", "ONGC", "TITAN",
  "NESTLEIND", "SUNPHARMA", "BAJAJFINSV", "TATAMOTORS", "POWERGRID",
  "NTPC", "TECHM", "DIVISLAB", "DRREDDY", "CIPLA",
  "ADANIENT", "ADANIPORTS", "COALINDIA", "GRASIM", "BPCL",
  "TATASTEEL", "JSWSTEEL", "HINDALCO", "INDUSINDBK", "BRITANNIA",
  "APOLLOHOSP", "EICHERMOT", "HEROMOTOCO", "TATACONSUM", "BAJAJ-AUTO",
  "SBILIFE", "HDFCLIFE", "PIDILITIND", "DABUR", "GODREJCP",
  "SHREECEM", "AMBUJACEM", "GAIL", "IOC", "HAVELLS",
  "BERGEPAINT", "MARICO", "COLPAL", "SIEMENS", "ABB",
  "BOSCHLTD", "MOTHERSON", "MUTHOOTFIN", "MANAPPURAM", "CHOLAFIN",
  "BANKBARODA", "PNB", "CANBK", "FEDERALBNK", "IDFCFIRSTB",
  "MCDOWELL-N", "UBL", "JUBLFOOD", "ZOMATO", "NYKAA",
  "PAYTM", "POLICYBZR", "DMART", "TRENT", "PAGEIND",
  "MPHASIS", "PERSISTENT", "COFORGE", "LTTS", "MINDTREE",
  "BIOCON", "AUROPHARMA", "TORNTPHARM", "ALKEM", "IPCALAB",
  "CONCOR", "IRCTC", "GMRINFRA", "ADANIGREEN", "TATAPOWER"
]

def init_db():
    engine = create_engine(DATABASE_URL)
    return engine

def process_and_save_data():
    engine = init_db()
    
    # Establish our insert statement with conflict resolution ON CONFLICT DO UPDATE
    insert_stmt = text("""
        INSERT INTO ohlcv (symbol, date, open, high, low, close, volume)
        VALUES (:symbol, :date, :open, :high, :low, :close, :volume)
        ON CONFLICT (symbol, date) DO UPDATE SET
            open = EXCLUDED.open,
            high = EXCLUDED.high,
            low = EXCLUDED.low,
            close = EXCLUDED.close,
            volume = EXCLUDED.volume;
    """)
    
    success_count = 0
    fail_count = 0
    
    for symbol in NSE_SYMBOLS:
        try:
            yf_symbol = f"{symbol}.NS"
            print(f"Downloading {yf_symbol}... ", end="", flush=True)
            
            # Download 2 years of OHLCV data
            df = yf.download(yf_symbol, period="2y", interval="1d", progress=False)
            
            if df.empty:
                print("Failed (No data)")
                fail_count += 1
                continue
                
            # Formatting Dataframe to be simple matching columns
            df.reset_index(inplace=True)
            
            # Unflatten MultiIndex columns if yfinance returned them
            df.columns = [c[0] if isinstance(c, tuple) else c for c in df.columns]
            
            rename_map = {
                'Date': 'date',
                'Datetime': 'date',
                'Open': 'open',
                'High': 'high',
                'Low': 'low',
                'Close': 'close',
                'Volume': 'volume'
            }
            df = df.rename(columns=rename_map)
            df['symbol'] = symbol
            
            # Sanitize datatypes safely
            # Convert timestamp to date strictly
            if 'date' in df.columns:
                df['date'] = pd.to_datetime(df['date']).dt.date
                
            # Retain only what matches our database schema
            cols_to_keep = ['symbol', 'date', 'open', 'high', 'low', 'close', 'volume']
            df = df[[c for c in cols_to_keep if c in df.columns]]
            
            # Drop NaN rows which would crash inserts
            df = df.dropna(subset=['open', 'high', 'low', 'close'])
            
            # Save CSV file
            csv_path = os.path.join(RAW_DATA_DIR, f"{symbol}.csv")
            df.to_csv(csv_path, index=False)
            
            # Save to PostgreSQL
            records = df.to_dict(orient='records')
            
            # Bulk execute is extremely fast in sqlalchemy 2.0
            with engine.begin() as conn:
                conn.execute(insert_stmt, records)
                
            print(f"Done ({len(df)} rows)")
            success_count += 1
            
            # Small respect delay for Yahoo Finance endpoint
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Failed ({str(e)})")
            fail_count += 1

    print(f"\nDownloaded {success_count} stocks successfully, {fail_count} failed")

if __name__ == "__main__":
    process_and_save_data()
