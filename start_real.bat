@echo off
title MarketLens AI Real Environment

ECHO =================================================
ECHO         STARTING MARKETLENS AI (REAL DATA)
ECHO =================================================
ECHO.
ECHO This script will:
ECHO 1. Set up the PostgreSQL database schema.
ECHO 2. Fetch real-time OHLCV data from NSE.
ECHO 3. Run the pattern scanner on real data.
ECHO 4. Start the Python backend server.
ECHO 5. Start the React frontend server.
ECHO.

REM --- Step 1: Setup Database Schema ---
ECHO [1/5] Setting up database schema...
python scripts/db_setup.py
IF %ERRORLEVEL% NEQ 0 (
    ECHO ERROR: Database setup failed. Please check your DB connection and schema.sql.
    GOTO :EOF
)
ECHO Schema applied successfully.
ECHO.

REM --- Step 2: Fetch Real Data ---
ECHO [2/5] Fetching real-time OHLCV data from NSE...
python backend/data/fetch_nse_data.py
IF %ERRORLEVEL% NEQ 0 (
    ECHO WARNING: Data fetching failed. The application might use stale data or fail.
) ELSE (
    ECHO Real data fetched successfully.
)
ECHO.

REM --- Step 3: Run Pattern Scanner ---
ECHO [3/5] Scanning for patterns using real data...
python backend/patterns/scanner.py
IF %ERRORLEVEL% NEQ 0 (
    ECHO WARNING: Pattern scanning failed.
) ELSE (
    ECHO Pattern scanning completed successfully.
)
ECHO.

REM --- Step 4: Start Backend Server ---
ECHO [4/5] Starting FastAPI backend server on http://localhost:8000
cd backend
start "MarketLens Backend" cmd /c "uvicorn api.main:app --reload --host 0.0.0.0 --port 8000"
cd ..
ECHO Backend server process started.
ECHO API Documentation: http://localhost:8000/docs
ECHO.

REM --- Step 5: Start Frontend Server ---
ECHO [5/5] Starting React frontend server on http://localhost:5174
cd frontend
start "MarketLens Frontend" cmd /c "npm run dev"
cd ..
ECHO Frontend server process started.
ECHO.

ECHO =================================================
ECHO          🚀 LAUNCHING APPLICATION 🚀
ECHO =================================================
ECHO.
ECHO Waiting for servers to initialize...
timeout /t 10 /nobreak > nul

start http://localhost:5174

ECHO.
ECHO Your MarketLens AI environment is now running with REAL DATA!
ECHO - Backend API: http://localhost:8000
ECHO - Frontend: http://localhost:5174
ECHO.
ECHO You can close this window when you are finished.
ECHO The server windows will need to be closed manually.

:EOF
pause
