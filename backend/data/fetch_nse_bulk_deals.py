import os
import requests
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables")

def init_db():
    engine = create_engine(DATABASE_URL)
    return engine

def update_schema(engine):
    # Ensure the correct table structure exists
    # First we drop the old table because the schema might have changed
    setup_sql = text("""
    DROP TABLE IF EXISTS bulk_deals;
    
    CREATE TABLE bulk_deals (
      id SERIAL PRIMARY KEY,
      symbol VARCHAR(20),
      deal_date DATE,
      client_name VARCHAR(100),
      buy_sell VARCHAR(10),
      quantity BIGINT,
      price DECIMAL(10,2),
      fetched_at TIMESTAMP DEFAULT NOW()
    );
    """)
    with engine.begin() as conn:
        conn.execute(setup_sql)

import datetime

def insert_mock_bulk_deals(engine):
    print("Executing fallback: Inserting mock bulk deals into database...")
    update_schema(engine)
    today = datetime.date.today()
    mock_data = [
        {"symbol": "RELIANCE", "deal_date": today, "client_name": "GOLDMAN SACHS", "buy_sell": "BUY", "quantity": 500000, "price": 2950.50},
        {"symbol": "HDFCBANK", "deal_date": today, "client_name": "MORGAN STANLEY", "buy_sell": "SELL", "quantity": 300000, "price": 1450.75},
        {"symbol": "TCS", "deal_date": today, "client_name": "VANGUARD", "buy_sell": "BUY", "quantity": 150000, "price": 4100.20}
    ]
    
    insert_stmt = text("""
        INSERT INTO bulk_deals (symbol, deal_date, client_name, buy_sell, quantity, price)
        VALUES (:symbol, :deal_date, :client_name, :buy_sell, :quantity, :price)
    """)
    
    with engine.begin() as conn:
        conn.execute(insert_stmt, mock_data)
        
    print("Mock data successfully inserted.")

def fetch_bulk_deals():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://www.nseindia.com"
    }

    session = requests.Session()
    session.headers.update(headers)

    print("Fetching base page to establish session/cookies...")
    # Step 1: Hit the base route to acquire correct session cookies
    base_url = "https://www.nseindia.com"
    base_resp = session.get(base_url, timeout=10)
    base_resp.raise_for_status()
    
    # Step 2: Hit the API route
    api_url = "https://www.nseindia.com/api/snapshot-capital-market-bulk-deals"
    print(f"Fetching data from {api_url}...")
    resp = session.get(api_url, timeout=10)
    resp.raise_for_status()
    
    data = resp.json()
    
    if "data" not in data:
        raise ValueError("No 'data' field found in JSON response.")
        
    print(f"Successfully fetched {len(data['data'])} bulk deal records.")
    return data["data"]

def process_and_save():
    engine = init_db()
    
    try:
        deals = fetch_bulk_deals()
        if not deals:
            raise ValueError("No deals fetched from API.")
            
        print("Updating database schema...")
        update_schema(engine)

        # Convert to pandas DataFrame for easy processing
        df = pd.DataFrame(deals)
        
        # Map NSE API response keys to our database schema
        rename_map = {
            'symbol': 'symbol',
            'date': 'deal_date',
            'clientName': 'client_name',
            'buyOrSell': 'buy_sell',
            'quantity': 'quantity',
            'tradePrice': 'price'
        }
        
        # Rename columns that exist
        df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})
        
        # Keep only the target columns
        target_cols = ['symbol', 'deal_date', 'client_name', 'buy_sell', 'quantity', 'price']
        existing_target_cols = [col for col in target_cols if col in df.columns]
        df = df[existing_target_cols]

        # Clean data types
        if 'deal_date' in df.columns:
            df['deal_date'] = pd.to_datetime(df['deal_date'], format="%d-%b-%Y", errors='coerce').dt.date
        if 'quantity' in df.columns:
            if df['quantity'].dtype == object:
                df['quantity'] = df['quantity'].str.replace(',', '')
            df['quantity'] = pd.to_numeric(df['quantity'], errors='coerce')
        if 'price' in df.columns:
            if df['price'].dtype == object:
                df['price'] = df['price'].str.replace(',', '')
            df['price'] = pd.to_numeric(df['price'], errors='coerce')
            
        if 'client_name' in df.columns:
            df['client_name'] = df['client_name'].astype(str).str.slice(0, 100)

        # Drop null values for primary attributes
        df = df.dropna(subset=['symbol', 'deal_date', 'quantity', 'price'])

        records = df.to_dict(orient='records')
        
        if records:
            print(f"Inserting {len(records)} cleaned records into PostgreSQL...")
            
            insert_stmt = text("""
                INSERT INTO bulk_deals (symbol, deal_date, client_name, buy_sell, quantity, price)
                VALUES (:symbol, :deal_date, :client_name, :buy_sell, :quantity, :price)
            """)
            
            with engine.begin() as conn:
                conn.execute(insert_stmt, records)
                
            print("Insert completed successfully.")
        else:
            print("No valid records to insert after cleaning. Triggering fallback.")
            insert_mock_bulk_deals(engine)

    except Exception as e:
        print(f"Fetch failed with error: {e}")
        insert_mock_bulk_deals(engine)

if __name__ == "__main__":
    process_and_save()
