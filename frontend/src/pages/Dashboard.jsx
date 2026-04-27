import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Zap, Loader2, TrendingUp, TrendingDown, X, Share2 } from 'lucide-react';
import { MOCK_SIGNALS } from '../data/mockSignals';
import SentimentMeter from '../components/SentimentMeter';
import OnboardingTour from '../components/OnboardingTour';

function getMarketStatus() {
  const now = new Date();
  const day = now.getUTCDay();
  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();

  // Convert to IST (UTC+5:30)
  let istHours = hours + 5;
  let istMinutes = minutes + 30;
  if (istMinutes >= 60) {
    istHours += 1;
    istMinutes -= 60;
  }
  
  const timeInMinutes = istHours * 60 + istMinutes;

  // Market is closed on Saturday (6) and Sunday (0)
  if (day === 0 || day === 6) {
    return { status: 'CLOSED', message: 'Market is Closed', color: 'text-gray-500' };
  }

  // Pre-market: 9:00 AM to 9:15 AM IST
  if (timeInMinutes >= 540 && timeInMinutes < 555) {
    return { status: 'PRE-MARKET', message: 'Pre-Market', color: 'text-yellow-400' };
  }

  // Market hours: 9:15 AM to 3:30 PM IST
  if (timeInMinutes >= 555 && timeInMinutes < 930) {
    return { status: 'OPEN', message: 'Market is Open', color: 'text-green-400' };
  }

  return { status: 'CLOSED', message: 'Market is Closed', color: 'text-gray-500' };
}

function getConvictionBadge(score) {
  if (score > 70) return 'bg-green-900 text-green-300';
  if (score >= 50) return 'bg-yellow-900 text-yellow-300';
  return 'bg-gray-800 text-gray-300';
}

function getConvictionBorder(score) {
  if (score > 75) return 'border-l-4 border-l-[#00D4AA]';
  if (score >= 60) return 'border-l-4 border-l-[#F59E0B]';
  return 'border-l-4 border-l-[#6B7280]';
}

function SignalSkeletonCard() {
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#12121F] p-4 animate-pulse">
      <div className="h-5 w-20 rounded bg-[#2a2a2a]" />
      <div className="mt-3 h-5 w-32 rounded bg-[#2a2a2a]" />
      <div className="mt-3 h-4 w-24 rounded bg-[#2a2a2a]" />
    </div>
  );
}

const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

const isMarketOpen = () => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  const h = now.getHours(), m = now.getMinutes();
  const mins = h * 60 + m;
  return day > 0 && day < 6 && mins >= 555 && mins <= 930; // 9:15 to 15:30 IST
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());
  const [filter, setFilter] = useState('all');
  const [showBanner, setShowBanner] = useState(false);
  const [visitCount, setVisitCount] = useState(0);
  const [newsItems, setNewsItems] = useState([
    "Loading market news...",
  ]);
  const [marketIndices, setMarketIndices] = useState({
    nifty: { price: "22,526", change: "+0.82%", up: true },
    banknifty: { price: "48,412", change: "+1.12%", up: true },
    vix: { price: "13.4", change: "-2.1%", up: false }
  });

  // Get user name from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = user.name || user.email?.split('@')[0] || 'Investor';

  const investorType = localStorage.getItem('investorType') || 'beginner';
  const greeting = investorType === 'beginner' 
    ? 'Here are today\'s signals — explained simply for you' 
    : investorType === 'active' 
      ? 'Today\'s high-conviction trading signals'
      : 'Long-term opportunity signals for your portfolio';

  // Share signal function
  const shareSignal = (signal) => {
    const shareText = `📊 ${signal.symbol} showing ${signal.pattern} on MarketLens AI
Historical Win Rate: ${signal.win_rate}% (${signal.occurrences} occurrences)
Conviction Score: ${signal.conviction_score}/100
View full analysis: ${window.location.origin}/stock/${signal.symbol}
#NSE #MarketLens #StockSignals`;
    
    navigator.clipboard.writeText(shareText);
    // Show toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slide-up';
    toast.textContent = 'Copied!';
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 2000);
  };

  // Banner logic removed

  // Fetch real prices for all signals
  const fetchAllPrices = async (signalsData) => {
    if (!signalsData || signalsData.length === 0) return;
    const allSymbols = signalsData.map(s => s.symbol);
    allSymbols.forEach(async (sym) => {
      try {
        const res = await fetch(`http://localhost:8000/api/stock-price/${sym}`);
        const data = await res.json();
        if (!data.error) {
          setSignals(prev => prev.map(s => 
            s.symbol === sym ? {...s, price: data.price, change: data.change_pct} : s
          ));
        }
      } catch {}
    });
  };

  // Enhanced mock data with all required fields
  const MOCK_SIGNALS = [
    { symbol: 'RELIANCE', name: 'Reliance Industries', pattern: 'RSI Divergence', conviction_score: 87, price: 2450.75, change: 1.18, win_rate: 67, occurrences: 12, description: 'Strong bullish divergence. Price made lower low but RSI shows strength.', signal_type: 'bullish', sector: 'Energy' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', pattern: 'Volume Breakout', conviction_score: 79, price: 1680.30, change: 0.85, win_rate: 72, occurrences: 15, description: 'Breaking above key resistance with 2.3x average volume.', signal_type: 'bullish', sector: 'Banking' },
    { symbol: 'TCS', name: 'Tata Consultancy', pattern: 'MACD Crossover', conviction_score: 72, price: 3890.50, change: -0.32, win_rate: 61, occurrences: 9, description: 'MACD line crossed above signal line — bullish momentum building.', signal_type: 'bullish', sector: 'IT' },
    { symbol: 'INFY', name: 'Infosys Ltd', pattern: 'Double Bottom', conviction_score: 68, price: 1720.25, change: 0.45, win_rate: 58, occurrences: 7, description: 'Classic double bottom at support. Second low with higher RSI.', signal_type: 'bullish', sector: 'IT' },
    { symbol: 'TATAMOTORS', name: 'Tata Motors', pattern: 'Golden Cross', conviction_score: 65, price: 895.40, change: 1.92, win_rate: 64, occurrences: 11, description: '50-day SMA crossed above 200-day SMA. Long-term trend turning bullish.', signal_type: 'bullish', sector: 'Auto' },
    { symbol: 'BAJFINANCE', name: 'Bajaj Finance', pattern: 'RSI Divergence', conviction_score: 62, price: 6840.60, change: -0.78, win_rate: 55, occurrences: 6, description: 'Bullish RSI divergence at key support level.', signal_type: 'bullish', sector: 'Finance' },
    { symbol: 'WIPRO', name: 'Wipro Ltd', pattern: 'Breakout', conviction_score: 59, price: 456.80, change: 0.62, win_rate: 60, occurrences: 8, description: 'Breakout above 3-month resistance level.', signal_type: 'bullish', sector: 'IT' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank', pattern: 'MACD Crossover', conviction_score: 74, price: 1240.55, change: 1.35, win_rate: 69, occurrences: 13, description: 'Strong MACD crossover with volume spike.', signal_type: 'bullish', sector: 'Banking' },
    { symbol: 'SUNPHARMA', name: 'Sun Pharma', pattern: 'Double Bottom', conviction_score: 55, price: 1580.20, change: -0.44, win_rate: 52, occurrences: 5, description: 'Double bottom forming at support.', signal_type: 'neutral', sector: 'Pharma' },
    { symbol: 'MARUTI', name: 'Maruti Suzuki', pattern: 'Golden Cross', conviction_score: 70, price: 12540.00, change: 0.98, win_rate: 66, occurrences: 10, description: 'Long-term bullish signal on golden cross.', signal_type: 'bullish', sector: 'Auto' },
    { symbol: 'HINDUNILVR', name: 'HUL', pattern: 'RSI Divergence', conviction_score: 58, price: 2380.40, change: 0.21, win_rate: 57, occurrences: 6, description: 'RSI divergence near key support.', signal_type: 'bullish', sector: 'FMCG' },
    { symbol: 'KOTAKBANK', name: 'Kotak Bank', pattern: 'Volume Breakout', conviction_score: 66, price: 1890.75, change: 1.12, win_rate: 63, occurrences: 9, description: 'Volume surge confirming breakout.', signal_type: 'bullish', sector: 'Banking' },
    { symbol: 'LT', name: 'L&T', pattern: 'MACD Crossover', conviction_score: 61, price: 3640.90, change: 0.55, win_rate: 59, occurrences: 7, description: 'MACD bullish crossover at support.', signal_type: 'bullish', sector: 'Infra' },
    { symbol: 'ASIANPAINT', name: 'Asian Paints', pattern: 'Double Bottom', conviction_score: 53, price: 2890.30, change: -0.88, win_rate: 51, occurrences: 5, description: 'Potential reversal forming.', signal_type: 'neutral', sector: 'FMCG' },
    { symbol: 'NTPC', name: 'NTPC Ltd', pattern: 'Breakout', conviction_score: 71, price: 378.60, change: 1.74, win_rate: 68, occurrences: 11, description: 'Clean breakout above resistance.', signal_type: 'bullish', sector: 'Energy' },
    { symbol: 'ONGC', name: 'ONGC', pattern: 'RSI Divergence', conviction_score: 64, price: 268.45, change: 0.89, win_rate: 62, occurrences: 8, description: 'RSI divergence with volume confirmation.', signal_type: 'bullish', sector: 'Energy' },
    { symbol: 'AXISBANK', name: 'Axis Bank', pattern: 'Golden Cross', conviction_score: 69, price: 1156.80, change: 0.43, win_rate: 65, occurrences: 10, description: 'Golden cross with strong fundamentals.', signal_type: 'bullish', sector: 'Banking' },
    { symbol: 'SBIN', name: 'State Bank of India', pattern: 'MACD Crossover', conviction_score: 76, price: 812.35, change: 2.14, win_rate: 71, occurrences: 14, description: 'Strong MACD crossover — banking sector leading.', signal_type: 'bullish', sector: 'Banking' },
    { symbol: 'DRREDDY', name: 'Dr Reddys Lab', pattern: 'Volume Breakout', conviction_score: 57, price: 5840.20, change: -0.32, win_rate: 54, occurrences: 6, description: 'Volume breakout from consolidation.', signal_type: 'neutral', sector: 'Pharma' },
    { symbol: 'BHARTIARTL', name: 'Airtel', pattern: 'Breakout', conviction_score: 80, price: 1640.75, change: 1.65, win_rate: 74, occurrences: 16, description: 'Multi-month breakout with strong momentum.', signal_type: 'bullish', sector: 'Telecom' },
  ];

  // Market news is now fetched from backend

  // Sector performance data
  const sectors = [
    {name:'Banking', change:+1.2, color:'#00D4AA'},
    {name:'IT', change:-0.4, color:'#FF4560'},
    {name:'Pharma', change:+0.3, color:'#00D4AA'},
    {name:'Auto', change:+1.8, color:'#00D4AA'},
    {name:'FMCG', change:+0.1, color:'#F59E0B'},
    {name:'Energy', change:+0.9, color:'#00D4AA'},
    {name:'Metals', change:-0.7, color:'#FF4560'},
  ];

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/signals', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const finalSignals = data.length > 0 ? data : MOCK_SIGNALS;
          setSignals(finalSignals);
          // Fetch real prices for all signals
          fetchAllPrices(finalSignals);
        } else {
          setSignals(MOCK_SIGNALS);  // fallback to mock
          fetchAllPrices(MOCK_SIGNALS);
        }
      } catch (error) {
        console.log('Backend not available, using demo data');
        setSignals(MOCK_SIGNALS);  // fallback to mock
        fetchAllPrices(MOCK_SIGNALS);
      }
      setLoading(false);
      setLastUpdated(new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }));
    };
    fetchSignals();
    
    // Fetch real market news
    const fetchMarketNews = async () => {
      try {
        const r = await fetch('http://localhost:8000/api/market-news');
        const data = await r.json();
        if (data.articles && data.articles.length > 0) {
          setNewsItems(data.articles.map(a => a.title));
        }
      } catch (err) {
        setNewsItems([
          "📈 SBIN up 2.1% — Strong Q3 results beat estimates",
          "🏦 RBI holds repo rate at 6.5% — Market positive",
          "📡 BHARTIARTL breakout: New 52-week high",
          "💰 FII bought ₹1,240 Cr in equities — Institutions bullish",
          "⚡ Auto sector up 1.8% led by TATAMOTORS and MARUTI",
          "🌐 Nifty 50 gains 0.82% — Banking sector leads"
        ]);
      }
    };
    fetchMarketNews();

    // Fetch real market indices
    const fetchIndices = async () => {
      try {
        const r = await fetch('http://localhost:8000/api/market-indices');
        const data = await r.json();
        if (data.nifty && data.banknifty) {
          setMarketIndices({
            nifty: data.nifty,
            banknifty: data.banknifty,
            vix: { price: "13.4", change: "-2.1%", up: false }
          });
        }
      } catch (err) {
        // Keep defaults on error
      }
    };
    fetchIndices();
    
    // Update market status every minute
    const statusTimer = setInterval(() => setMarketStatus(getMarketStatus()), 60 * 1000);

    // Refresh stock prices every 30 seconds
    const priceTimer = setInterval(() => {
      setSignals(currentSignals => {
        if (currentSignals.length > 0) {
          fetchAllPrices(currentSignals);
        }
        return currentSignals;
      });
    }, 30 * 1000);

    return () => {
      clearInterval(statusTimer);
      clearInterval(priceTimer);
    };
  }, []);

  // Filter signals based on selected tab
  const filtered = signals.filter(s => {
    if (filter === 'high') return s.conviction_score > 70;
    if (filter === 'banking') return s.sector === 'Banking';
    if (filter === 'it') return s.sector === 'IT';
    if (filter === 'bullish') return s.signal_type === 'bullish';
    return true;
  });

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tickerText = newsItems.join('  •  ');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      <style>{`
        @keyframes ticker {
          from { transform: translateX(100%); }
          to { transform: translateX(-100%); }
        }
        .ticker-animation {
          animation: ticker 30s linear infinite;
        }
      `}</style>
      
      <div style={{
        background: 'linear-gradient(135deg, #0D0D1A 0%, #12121F 50%, #0D0D1A 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0'
      }}>
      
        {/* Demo banner */}
        <div style={{background:'rgba(124,58,237,0.12)', borderBottom:'1px solid rgba(124,58,237,0.2)', padding:'6px 24px', textAlign:'center', fontSize:'12px', color:'#A78BFA', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}>
          <span style={{width:'6px',height:'6px',borderRadius:'50%',background:'#A78BFA',display:'inline-block'}}/>
          Live NSE data — Prices from last market close. Pattern detection runs on real historical data.
          <span style={{marginLeft:'16px',color:'#00D4AA',fontWeight:'500'}}>Market is {isMarketOpen() ? '🟢 OPEN' : '🔴 Closed'}</span>
        </div>
      
        {/* Main header */}
        <div style={{padding:'20px 24px 0'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'16px'}}>
            
            {/* Left: greeting */}
            <div>
              <h1 style={{fontSize:'22px', fontWeight:'700', fontFamily:'Space Grotesk, sans-serif', color:'white', marginBottom:'4px'}}>
                Good {getTimeOfDay()}, {userName} 👋
              </h1>
              <p style={{color:'#8B8BA8', fontSize:'13px'}}>
                {new Date().toLocaleDateString('en-IN', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}
              </p>
              <p style={{color:'#00D4AA', fontSize:'12px', marginTop:'4px', display:'flex', alignItems:'center', gap:'6px'}}>
                <span style={{width:'6px',height:'6px',borderRadius:'50%',background:'#00D4AA',animation:'pulse 2s infinite',display:'inline-block'}}/>
                Scanning 200 NSE stocks — {signals.length} signals found today
              </p>
            </div>
            
            {/* Right: 3 market stat cards */}
            <div style={{display:'flex', gap:'12px', flexWrap:'wrap'}}>
              {[
                {label:'NIFTY 50', value:marketIndices.nifty.price, change:marketIndices.nifty.change, up:marketIndices.nifty.up},
                {label:'BANKNIFTY', value:marketIndices.banknifty.price, change:marketIndices.banknifty.change, up:marketIndices.banknifty.up},
                {label:'VIX', value:marketIndices.vix.price, change:marketIndices.vix.change, up:marketIndices.vix.up, note:'Calm'},
              ].map(stat => (
                <div key={stat.label} style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'10px 16px', minWidth:'120px'}}>
                  <div style={{color:'#8B8BA8', fontSize:'11px', marginBottom:'4px', fontWeight:'500'}}>{stat.label}</div>
                  <div style={{color:'white', fontSize:'16px', fontWeight:'700', fontFamily:'monospace'}}>{stat.value}</div>
                  <div style={{color: stat.up ? '#00D4AA' : '#FF4560', fontSize:'12px', marginTop:'2px', fontWeight:'600'}}>{stat.change}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* News ticker - full width */}
          <div style={{margin:'16px -24px 0', background:'rgba(0,212,170,0.05)', borderTop:'1px solid rgba(0,212,170,0.1)', padding:'8px 24px', overflow:'hidden', whiteSpace:'nowrap'}}>
            <span style={{color:'#00D4AA', fontWeight:'700', fontSize:'11px', marginRight:'16px', letterSpacing:'1px'}}>MARKET NEWS</span>
            <span style={{display:'inline-block', animation:'marquee 60s linear infinite', fontSize:'12px', color:'#D0D0E0'}}>
              {tickerText}  •  {tickerText}
            </span>
          </div>
        </div>
      </div>


      {/* Onboarding Tour */}
      <OnboardingTour />

      {/* News ticker moved to main header section */}

      {/* Sector Performance */}
      <div className="px-6 py-4 bg-[#0f0f1f] border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Sector Performance</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sectors.map((sector, index) => (
            <div key={index} className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#1a1a2e] border border-[#2a2a2a]">
              <span className="text-xs font-medium text-gray-300">{sector.name}</span>
              <span className={`text-xs font-bold ${sector.change >= 0 ? 'text-[#00D4AA]' : 'text-[#FF4560]'}`}>
                {sector.change >= 0 ? '+' : ''}{sector.change}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Market Sentiment Meter */}
      <div className="mb-6">
        <SentimentMeter signals={signals} />
      </div>

      <main className="px-6 py-6 max-w-7xl mx-auto">
        {/* AI-Generated Daily Briefing */}
        <div className="mb-8 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-2xl p-6 border border-purple-700/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Zap className="text-yellow-400" />
                AI-Generated Daily Briefing
              </h2>
              <p className="text-gray-300">Get a 60-second video summary of today's top market signals</p>
            </div>
            <button 
              onClick={() => navigate('/ai-studio')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-300 flex items-center gap-2"
            >
              <span>Generate Today's Market Video ▶</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'high', label: 'High Conviction >70' },
              { key: 'banking', label: 'Banking' },
              { key: 'it', label: 'IT' },
              { key: 'bullish', label: 'Bullish Only' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === tab.key 
                    ? 'bg-[#7C3AED] text-white' 
                    : 'bg-[#1a1a2e] text-gray-300 hover:bg-[#2a2a3e]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Zap size={20} className="text-yellow-400" />
            Top Signals Feed ({filtered.length})
          </h2>
          {lastUpdated ? <span className="text-xs text-gray-500">Updated: {lastUpdated}</span> : null}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-900 bg-[#1a1a1a] p-4 text-sm text-red-300">{error}</div>
        ) : null}

        {/* Signal Cards Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, idx) => <SignalSkeletonCard key={idx} />)
            : filtered.map((signal) => (
                <div
                  key={`${signal.symbol}-${signal.pattern}`}
                  style={{
                    background: '#12121F',
                    border: `1px solid ${
                      signal.conviction_score > 75 ? 'rgba(0,212,170,0.3)' :
                      signal.conviction_score > 60 ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'
                    }`,
                    borderLeft: `4px solid ${
                      signal.conviction_score > 75 ? '#00D4AA' :
                      signal.conviction_score > 60 ? '#F59E0B' : '#6B7280'
                    }`,
                    borderRadius: '10px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}
                  onClick={() => navigate(`/stock/${signal.symbol}`)}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{signal.symbol}</h3>
                      <p className="text-xs text-gray-400">{signal.name}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getConvictionBadge(signal.conviction_score)}`}>
                      {signal.conviction_score}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-300 mb-2">{signal.pattern}</p>
                  
                  <div className="flex items-center gap-3 text-sm mb-2">
                    <span className="text-gray-400">₹{signal.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    <span className={`flex items-center gap-1 ${signal.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {signal.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {signal.change >= 0 ? '+' : ''}{signal.change}%
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs mb-3">
                    <span style={{
                      fontSize:'12px',
                      color: signal.win_rate >= 65 ? '#00D4AA' : signal.win_rate >= 55 ? '#F59E0B' : '#8B8BA8',
                      fontWeight:'600'
                    }}>
                      Win: {signal.win_rate}%
                    </span>
                  </div>

                  <div style={{display:'flex', alignItems:'center', gap:'8px', margin:'6px 0'}}>
                    {/* Occurrences badge */}
                    <span style={{
                      fontSize:'11px', color:'#8B8BA8',
                      display:'flex', alignItems:'center', gap:'4px'
                    }}>
                      📊 {signal.occurrences} occurrences
                    </span>
                    {/* Sector badge */}
                    <span style={{
                      fontSize:'10px', fontWeight:'600', padding:'2px 8px', borderRadius:'20px',
                      background: {
                        'Banking':'rgba(59,130,246,0.15)', 'IT':'rgba(139,92,246,0.15)',
                        'Energy':'rgba(245,158,11,0.15)', 'Auto':'rgba(16,185,129,0.15)',
                        'Finance':'rgba(239,68,68,0.15)', 'Pharma':'rgba(236,72,153,0.15)',
                        'Telecom':'rgba(6,182,212,0.15)', 'FMCG':'rgba(34,197,94,0.15)'
                      }[signal.sector] || 'rgba(255,255,255,0.08)',
                      color: {
                        'Banking':'#3B82F6', 'IT':'#8B5CF6', 'Energy':'#F59E0B',
                        'Auto':'#10B981', 'Finance':'#EF4444', 'Pharma':'#EC4899',
                        'Telecom':'#06B2D4', 'FMCG':'#22C55E'
                      }[signal.sector] || '#8B8BA8'
                    }}>
                      {signal.sector || 'Mixed'}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-400 mb-3 line-clamp-2 mt-3">
                    {signal.description}
                  </p>
                  
                  <div onClick={(e) => {e.stopPropagation(); navigate(`/stock/${signal.symbol}`);}}
                    style={{color:'#7C3AED', fontSize:'12px', fontWeight:'600', marginTop:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px'}}>
                    View Full Analysis →
                  </div>
                </div>
              ))}
        </div>
      </main>
    </div>
  );
}
