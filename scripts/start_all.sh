#!/bin/bash
echo "🚀 Starting MarketLens AI..."
# Start Redis (if installed)
redis-server --daemonize yes 2>/dev/null || echo "Redis not available"
# Start backend
cd backend && uvicorn api.main:app --port 8000 --reload &
BACKEND_PID=$!
echo "✅ Backend running on http://localhost:8000"
# Start frontend
cd frontend && npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend running on http://localhost:5173"
echo ""
echo "Open http://localhost:5173 in your browser"
echo "API docs: http://localhost:8000/docs"
