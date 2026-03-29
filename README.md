<img width="1917" height="917" alt="image" src="https://github.com/user-attachments/assets/e94b4c32-a9f8-4468-8385-d9b6733ea30e" />

# MarketLens AI 📈

An intelligent NSE stock analysis platform that uses AI to detect trading patterns, generate video updates, and provide real-time market insights.

## 🚀 Features

### Core Functionality
- **📊 Real-time Market Data**: Live NSE stock prices and market indices
- **🤖 AI Signal Detection**: Pattern recognition using advanced algorithms
- **📹 AI Video Studio**: Generate market update videos with voice narration
- **🧑 Avatar Videos**: D-ID integration for talking presenter videos
- **📱 Portfolio Management**: Track holdings and calculate P&L
- **⚠️ Smart Alerts**: Custom price and pattern alerts
- **📈 Technical Analysis**: Charts with RSI, MACD, and volume indicators

### Technology Stack
- **Frontend**: React 18 with TailwindCSS and Framer Motion
- **Backend**: FastAPI with PostgreSQL and Redis
- **AI Services**: Gemini API for script generation
- **Voice**: ElevenLabs for natural narration
- **Video**: D-ID API for avatar generation
- **Database**: PostgreSQL with SQLAlchemy ORM

## 🛠️ Setup Instructions

### Prerequisites
- Python 3.8+ installed
- Node.js 16+ installed
- PostgreSQL 12+ running
- Redis server running

### 1. Clone Repository
```bash
git clone <repository-url>
cd MarketLens-AI
```

### 2. Environment Configuration
Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/marketlens
REDIS_URL=redis://localhost:6379

# AI/LLM APIs
GEMINI_API_KEY=your_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVEN_VOICE_ID=pNInz6obpg8n9Y6ytmGj
D_ID_API_KEY=your_d_id_api_key

# Market Data
NEWS_API_KEY=your_news_api_key

# App Config
ENVIRONMENT=development
PORT=8000
FRONTEND_URL=http://localhost:5174

# Firebase
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Email Alerts
ALERT_EMAIL=your_email@gmail.com
ALERT_EMAIL_PASSWORD=your_app_password
```

### 3. API Keys Setup

#### Gemini API (for AI script generation)
1. Visit https://makersuite.google.com/app/apikey
2. Create new API key
3. Copy key to `GEMINI_API_KEY` in .env

#### ElevenLabs API (for voice narration)
1. Visit https://elevenlabs.io/
2. Sign up/login to your account
3. Go to Profile → API Keys
4. Copy key to `ELEVENLABS_API_KEY` in .env

#### D-ID API (for avatar videos)
1. Visit https://d-id.com/
2. Sign up/login to your account
3. Go to Account Settings → API Keys
4. Create new key or copy existing
5. Copy key to `D_ID_API_KEY` in .env

#### News API (for market news)
1. Visit https://newsapi.org/
2. Sign up and get API key
3. Copy key to `NEWS_API_KEY` in .env

### 4. Database Setup

#### PostgreSQL
```bash
# Create database
createdb marketlens

# Create user (optional)
createuser marketlens_user
psql -c "ALTER USER marketlens_user PASSWORD 'your_password';"
```

#### Redis
```bash
# Start Redis server
redis-server
```

### 5. Quick Start

#### Option 1: Using Setup Script (Recommended)
```bash
# Run the complete setup
start_demo.bat
```

#### Option 2: Manual Setup
```bash
# Setup database schema
python scripts/db_setup.py

# Seed demo data
python backend/scripts/seed_demo_data.py

# Start backend server
cd backend
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# Start frontend server (new terminal)
cd frontend
npm run dev
```

## 🌐 Application Access

After running `start_demo.bat`, access the application at:

- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Database Admin**: http://localhost:8000/admin

## 📱 Features Overview

### Dashboard
- Real-time market indices (Nifty, BankNifty)
- Top AI-detected signals with conviction scores
- Market news and sentiment analysis
- Interactive charts and technical indicators

### Portfolio Management
- Add/remove stock holdings
- Real-time P&L calculation
- AI portfolio analysis and recommendations
- Historical performance tracking

### AI Video Studio
- **Script Generation**: AI-written market update scripts
- **Voice Narration**: ElevenLabs natural voice synthesis
- **Scene Animation**: Professional video transitions
- **Avatar Videos**: D-ID talking presenter videos
- **Export Options**: Download scripts and videos

### Alert System
- Price-based alerts
- Pattern detection alerts
- WhatsApp and email notifications
- Custom threshold settings

## 🔧 Development

### Project Structure
```
MarketLens-AI/
├── backend/
│   ├── api/
│   │   ├── main.py              # FastAPI application
│   │   ├── video.py             # Video generation endpoints
│   │   ├── stocks.py            # Stock data endpoints
│   │   └── signals.py           # Signal detection logic
│   └── scripts/
│       ├── db_setup.py          # Database schema
│       └── seed_demo_data.py    # Demo data
├── frontend/
│   ├── src/
│   │   ├── pages/              # React components
│   │   ├── components/          # Reusable components
│   │   └── services/           # API calls
│   └── public/                # Static assets
└── docs/                     # Documentation
```

### Available Scripts
```bash
# Database operations
python scripts/db_setup.py              # Setup database schema
python backend/scripts/seed_demo_data.py  # Seed demo data

# Development servers
npm run dev                          # Frontend development
uvicorn api.main:app --reload         # Backend development

# Production build
npm run build                        # Build frontend
npm run preview                      # Preview production build
```

## 🔌 API Endpoints

### Stock Data
- `GET /api/stock-price/{symbol}` - Get current stock price
- `GET /api/stock-history/{symbol}` - Get historical data
- `GET /api/chart/{symbol}` - Get chart data

### Signals
- `GET /api/signals` - Get all current signals
- `GET /api/signal/{symbol}/{pattern}` - Get signal details
- `POST /api/refresh` - Refresh signal detection

### Video Generation
- `POST /api/generate-video-script` - Generate AI script
- `POST /api/generate-narration` - Generate voice audio
- `POST /api/generate-avatar-video` - Generate D-ID avatar video

### User Management
- `POST /api/user/preferences` - Update user settings
- `GET /api/user/watchlist` - Get watchlist

## 🎯 Key Features Explained

### AI Signal Detection
- **Pattern Recognition**: RSI Divergence, Volume Breakout, Golden Cross
- **Conviction Scoring**: 0-100 confidence rating
- **Win Rate Analysis**: Historical success rate calculation
- **Risk Assessment**: Automated risk level assignment

### Video Generation Pipeline
1. **Script Writing**: Gemini AI creates professional market commentary
2. **Voice Synthesis**: ElevenLabs generates natural narration
3. **Scene Animation**: Smooth transitions between market data
4. **Avatar Integration**: D-ID creates talking presenter videos
5. **Export Options**: Multiple download formats available

### Real-time Updates
- **WebSocket Connections**: Live price feeds
- **Automatic Refresh**: Configurable update intervals
- **Push Notifications**: Instant signal alerts
- **Background Processing**: Continuous analysis running

## 🔒 Security Features

- **JWT Authentication**: Secure user sessions
- **API Rate Limiting**: Prevent abuse
- **Input Validation**: Sanitized user inputs
- **CORS Configuration**: Proper cross-origin handling
- **Environment Variables**: Sensitive data protection

## 📊 Performance Optimization

- **Redis Caching**: Fast data retrieval
- **Database Indexing**: Optimized queries
- **Lazy Loading**: Improved frontend performance
- **Image Optimization**: Compressed assets
- **API Response Caching**: Reduced server load

## 🚀 Deployment

### Environment Variables for Production
```bash
ENVIRONMENT=production
PORT=8000
FRONTEND_URL=https://yourdomain.com
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Docker Deployment
```bash
# Build and run with Docker
docker-compose up -d
```

### Manual Deployment
```bash
# Backend
pip install -r requirements.txt
uvicorn api.main:app --host 0.0.0.0 --port 8000

# Frontend
npm install
npm run build
# Serve build files with nginx or similar
```

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### API Testing
- Visit http://localhost:8000/docs for interactive API documentation
- Test all endpoints with sample data
- Verify authentication flows

## 📝 Troubleshooting

### Common Issues

#### Backend Won't Start
- Check PostgreSQL is running: `pg_isready`
- Verify database URL in .env
- Check port 8000 is not in use

#### Frontend Build Errors
- Clear node_modules: `rm -rf node_modules`
- Reinstall dependencies: `npm install`
- Check Node.js version: `node --version`

#### API Keys Not Working
- Verify keys are correctly copied (no extra spaces)
- Check API key permissions and quotas
- Review API documentation for correct format

#### Database Connection Issues
- Verify PostgreSQL service status
- Check database exists: `psql -l`
- Test connection string format

#### Video Generation Fails
- Check ElevenLabs API quota
- Verify D-ID account permissions
- Ensure stable internet connection

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Commit changes: `git commit -m 'Add feature'`
5. Push to branch: `git push origin feature-name`
6. Create Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check existing documentation
- Review troubleshooting section

---

**MarketLens AI** - Transforming stock market analysis with artificial intelligence 📈✨
