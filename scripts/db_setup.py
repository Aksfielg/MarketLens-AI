import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from urllib.parse import urlparse, unquote
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Connect to the default 'postgres' database to create the new one
try:
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL not found in .env")

    parsed = urlparse(db_url)
    db_user = parsed.username or "postgres"
    db_password = unquote(parsed.password) if parsed.password else ""
    db_host = parsed.hostname or "localhost"
    db_port = parsed.port or 5432
    target_dbname = parsed.path.lstrip("/") or "marketlens"

    # We connect to default database 'postgres' first to orchestrate
    conn = psycopg2.connect(
        host=db_host,
        port=db_port,
        dbname="postgres",
        user=db_user,
        password=db_password
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    
    # Check if database exists
    cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{target_dbname}'")
    exists = cur.fetchone()
    
    if not exists:
        cur.execute(f"CREATE DATABASE {target_dbname}")
        print(f"Database '{target_dbname}' created successfully.")
    else:
        print(f"Database '{target_dbname}' already exists.")
        
    cur.close()
    conn.close()
    
    # Now connect to marketlens and run schema
    conn_marketlens = psycopg2.connect(
        host=db_host,
        port=db_port,
        dbname=target_dbname,
        user=db_user,
        password=db_password
    )
    
    schema_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'schema.sql')
    with open(schema_path, 'r') as f:
        schema_sql = f.read()
        
    cur_ml = conn_marketlens.cursor()
    cur_ml.execute(schema_sql)
    conn_marketlens.commit()
    cur_ml.close()
    conn_marketlens.close()
    
    print("Schema executed successfully.")
    
except Exception as e:
    print(f"DATABASE SETUP ERROR: {e}")
