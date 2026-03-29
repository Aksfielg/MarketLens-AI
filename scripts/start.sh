#!/bin/bash
echo "Starting MarketLens AI Backend..."
cd backend
pip install -q yfinance fastapi uvicorn redis google-generativeai requests 2>/dev/null
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
