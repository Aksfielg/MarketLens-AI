@echo off
title MarketLens AI Demo Environment

ECHO =================================================
ECHO         STARTING MARKETLENS AI DEMO
ECHO =================================================
ECHO.
ECHO This script will:
ECHO 1. Set up the PostgreSQL database schema.
ECHO 2. Seed the database with demo data.
ECHO 3. Start the Python backend server.
ECHO 4. Start the React frontend server.
ECHO.
ECHO Make sure your .env file is configured with the correct database credentials.
ECHO Make sure PostgreSQL is running.
ECHO.

REM --- Step 1: Setup Database Schema ---
ECHO [1/4] Setting up database schema...
python scripts/db_setup.py
IF %ERRORLEVEL% NEQ 0 (
    ECHO ERROR: Database setup failed. Please check your DB connection and schema.sql.
    GOTO :EOF
)
ECHO Schema applied successfully.
ECHO.

REM --- Step 2: Seed Demo Data ---
ECHO [2/4] Seeding database with demo data...
python backend/scripts/seed_demo_data.py
IF %ERRORLEVEL% NEQ 0 (
    ECHO WARNING: Seeding data failed. The application will run with an empty database.
) ELSE (
    ECHO Demo data seeded successfully.
)
ECHO.

REM --- Step 3: Start Backend Server ---
ECHO [3/4] Starting FastAPI backend server on http://localhost:8000
cd backend
start "MarketLens Backend" cmd /c "uvicorn api.main:app --reload --host 0.0.0.0 --port 8000"
cd ..
ECHO Backend server process started.
ECHO API Documentation: http://localhost:8000/docs
ECHO.

REM --- Step 4: Start Frontend Server ---
ECHO [4/4] Starting React frontend server on http://localhost:5174
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
start http://localhost:8000/docs

ECHO.
ECHO Your MarketLens AI demo environment is now running!
ECHO - Backend API: http://localhost:8000
ECHO - API Documentation: http://localhost:8000/docs
ECHO - Frontend: http://localhost:5174
ECHO.
ECHO Features available:
ECHO - Dashboard with real-time signals
ECHO - Portfolio management
ECHO - AI Video Studio with ElevenLabs voice
ECHO - D-ID Avatar video generation
ECHO.
ECHO You can close this window when you are finished.
ECHO The server windows will need to be closed manually.

:EOF
pause
