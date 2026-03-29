DROP TABLE IF EXISTS stocks CASCADE;
CREATE TABLE stocks (
  symbol VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100),
  sector VARCHAR(50),
  market_cap BIGINT
);

DROP TABLE IF EXISTS ohlcv CASCADE;
CREATE TABLE ohlcv (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20),
  date DATE,
  open DECIMAL(10,2),
  high DECIMAL(10,2),
  low DECIMAL(10,2),
  close DECIMAL(10,2),
  volume BIGINT,
  UNIQUE(symbol, date)
);

DROP TABLE IF EXISTS patterns CASCADE;
CREATE TABLE patterns (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20),
  pattern_type VARCHAR(50),
  detected_date DATE,
  key_price DECIMAL(10,2),
  conviction_score DECIMAL(5,2),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS backtest_results CASCADE;
CREATE TABLE backtest_results (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20),
  pattern_type VARCHAR(50),
  occurrences INTEGER,
  win_rate DECIMAL(5,2),
  avg_return DECIMAL(5,2),
  updated_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS bulk_deals CASCADE;
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

DROP TABLE IF EXISTS user_preferences CASCADE;
CREATE TABLE user_preferences (
  user_id VARCHAR(100) PRIMARY KEY,
  email VARCHAR(100),
  name VARCHAR(100),
  watchlist TEXT[],
  sectors TEXT[],
  notifications JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS portfolio CASCADE;
CREATE TABLE portfolio (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100),
  symbol VARCHAR(20),
  quantity INTEGER,
  buy_price DECIMAL(10,2),
  buy_date DATE
);

DROP TABLE IF EXISTS alerts CASCADE;
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100),
  symbol VARCHAR(20),
  alert_type VARCHAR(50),
  condition_value VARCHAR(100), -- Storing pattern names or prices
  is_active BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

DROP TABLE IF EXISTS chat_history CASCADE;
CREATE TABLE chat_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100),
  message TEXT,
  response TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
