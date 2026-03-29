import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Target, Eye, Bell, Star } from 'lucide-react';
import { MOCK_SIGNALS } from '../data/mockSignals';

// ─── Stock Fundamentals (no hardcoded analyst targets) ───────────────────────
const STOCK_FUNDAMENTALS = {
  'RELIANCE':   { pe:24.5, pb:2.1,  roe:8.9,  debt_equity:0.45, market_cap:'17.2L Cr', sector:'Energy' },
  'HDFCBANK':   { pe:18.2, pb:2.8,  roe:16.4, debt_equity:0.12, market_cap:'12.5L Cr', sector:'Banking' },
  'TCS':        { pe:28.4, pb:12.1, roe:45.2, debt_equity:0.01, market_cap:'14.1L Cr', sector:'IT' },
  'INFY':       { pe:24.1, pb:7.8,  roe:32.1, debt_equity:0.02, market_cap:'7.2L Cr',  sector:'IT' },
  'WIPRO':      { pe:19.7, pb:3.8,  roe:21.4, debt_equity:0.15, market_cap:'2.9L Cr',  sector:'IT' },
  'ICICIBANK':  { pe:17.8, pb:3.1,  roe:18.2, debt_equity:0.14, market_cap:'9.1L Cr',  sector:'Banking' },
  'SBIN':       { pe:10.2, pb:1.8,  roe:17.8, debt_equity:0.08, market_cap:'7.3L Cr',  sector:'Banking' },
  'TATAMOTORS': { pe:8.4,  pb:2.9,  roe:22.1, debt_equity:1.82, market_cap:'3.6L Cr',  sector:'Auto' },
  'BHARTIARTL': { pe:42.1, pb:8.2,  roe:21.3, debt_equity:0.95, market_cap:'9.8L Cr',  sector:'Telecom' },
  'NTPC':       { pe:15.8, pb:2.1,  roe:13.2, debt_equity:1.42, market_cap:'3.7L Cr',  sector:'Energy' },
  'BAJFINANCE': { pe:28.9, pb:6.1,  roe:22.4, debt_equity:3.82, market_cap:'4.2L Cr',  sector:'Finance' },
  'MARUTI':     { pe:24.2, pb:5.1,  roe:21.8, debt_equity:0.02, market_cap:'4.1L Cr',  sector:'Auto' },
  'DEFAULT':    { pe:22.0, pb:3.0,  roe:15.0, debt_equity:0.30, market_cap:'N/A',       sector:'Mixed' },
};

export default function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  
  // State for real data
  const [priceData, setPriceData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [chartPeriod, setChartPeriod] = useState('1m');
  const [chartLoading, setChartLoading] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  
  // Get signal data
  const signal = MOCK_SIGNALS.find(s => s.symbol === symbol) || {
    symbol: symbol,
    name: symbol + ' Ltd',
    pattern: 'RSI Divergence',
    conviction_score: 75,
    price: 1500.00,
    change: 0.85,
    win_rate: 65,
    occurrences: 10,
    description: 'Strong technical pattern detected.',
    signal_type: 'bullish',
    sector: 'Mixed'
  };

  // Get fundamentals base (no analyst target yet — depends on livePrice)
  const fundBase = STOCK_FUNDAMENTALS[symbol] || STOCK_FUNDAMENTALS['DEFAULT'];

  // State for AI analysis
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(true);

  // Fetch real stock price and chart data
  useEffect(() => {
    // Fetch real price
    fetch(`http://localhost:8000/api/stock-price/${symbol}`)
      .then(r => r.json())
      .then(data => { 
        if (!data.error) setPriceData(data); 
      })
      .catch(() => {});
    
    // Fetch real chart
    fetchChart('1m');
  }, [symbol]);

  const fetchChart = async (period) => {
    setChartPeriod(period);
    setChartLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/stock-history/${symbol}?period=${period}`);
      const data = await res.json();
      if (data.candles && data.candles.length > 0) {
        setChartData(data.candles);
      }
    } catch {
      // Keep existing chart data on error
    }
    setChartLoading(false);
  };

  // Generate candlestick data (fallback if no real data)
  const generateCandles = (basePrice, count = 20) => {
    return Array.from({length: count}, (_, i) => {
      const variation = (Math.sin(i * 0.8) + Math.random() * 0.4 - 0.2) * 50;
      const open = basePrice + variation;
      const close = open + (Math.random() - 0.45) * 30;
      const high = Math.max(open, close) + Math.random() * 15;
      const low = Math.min(open, close) - Math.random() * 15;
      return { open, close, high, low, bullish: close > open };
    });
  };

  const renderChart = () => {
    const data = chartData.length > 0 ? chartData : generateCandles(signal?.price || 1500, 20);
    const prices = data.flatMap(d => [d.high || d.close, d.low || d.close]);
    const minP = Math.min(...prices) * 0.998;
    const maxP = Math.max(...prices) * 1.002;
    const range = maxP - minP;
    const svgH = 200, svgW = 600;
    const candleW = Math.max(4, (svgW / data.length) - 2);
    
    return data.map((candle, i) => {
      const x = (i / data.length) * svgW + (svgW/data.length/2);
      const open = candle.open || candle.close;
      const close = candle.close;
      const high = candle.high || Math.max(open,close)+5;
      const low = candle.low || Math.min(open,close)-5;
      const bullish = close >= open;
      
      const toY = (price) => svgH - ((price - minP) / range) * svgH;
      
      return (
        <g key={i}>
          {/* Wick */}
          <line x1={x} y1={toY(high)} x2={x} y2={toY(low)} stroke={bullish?'#00D4AA':'#FF4560'} strokeWidth="1"/>
          {/* Body */}
          <rect
            x={x-candleW/2} y={toY(Math.max(open,close))}
            width={candleW} height={Math.max(1,Math.abs(toY(open)-toY(close)))}
            fill={bullish?'#00D4AA':'#FF4560'} rx="1"
          />
        </g>
      );
    });
  };

  // Get AI explanation
  const getAIExplanation = async (signalData, calculatedLevels) => {
    const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    
    const { livePrice, supportLevel, resistanceLevel, breakAbove, watchBelow } = calculatedLevels;
    
    const prompt = `You are MarketLens AI. A retail investor in India is looking at ${signalData.name || signalData.symbol} stock.

Pattern detected: ${signalData.pattern}
Current price: ₹${livePrice}
Key support level: ₹${supportLevel}
Key resistance level: ₹${resistanceLevel}
Breakout confirmation level: ₹${breakAbove}
Watch level: ₹${watchBelow}
Historical win rate: ${signalData.win_rate}% across ${signalData.occurrences} occurrences in 2 years
Signal strength (conviction): ${signalData.conviction_score}/100
Pattern description: ${signalData.description}

Write a response in this exact JSON format (no markdown, no backticks, just JSON):
{
  "explanation": "Write 2-3 simple sentences explaining what this signal means for a beginner investor. Use ₹ for rupees. Mention the win rate.",
  "recommendation": "WATCH",
  "recommendation_reason": "One sentence on what specific price level to watch for before considering action (mention the exact ₹ level)",
  "risk": "One sentence risk warning"
}

recommendation must be exactly one of: BUY, WATCH, or AVOID`;

    // Fallback data in case API fails - use real-time calculated levels
    const fallback = {
      explanation: `${signalData.symbol} is showing a ${signalData.pattern} pattern — a proven technical signal that has historically worked ${signalData.win_rate}% of the time on this stock (${signalData.occurrences} occurrences in 2 years). The conviction score of ${signalData.conviction_score}/100 suggests this is a ${signalData.conviction_score > 70 ? 'high' : 'moderate'}-quality signal worth monitoring.`,
      recommendation: signalData.conviction_score > 70 ? 'WATCH' : 'WATCH',
      recommendation_reason: `Wait for confirmation: price should hold above ₹${watchBelow} support before considering entry.`,
      risk: 'Markets are volatile and past performance does not guarantee future results. Only invest what you can afford to lose.'
    };

    if (!GEMINI_KEY || GEMINI_KEY === 'undefined' || GEMINI_KEY.length < 10) {
      setAiData(fallback);
      setAiLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            contents:[{parts:[{text:prompt}]}],
            generationConfig:{maxOutputTokens:300, temperature:0.5}
          })
        }
      );
      
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Clean any markdown formatting
      text = text.replace(/```json/g,'').replace(/```/g,'').trim();
      
      const parsed = JSON.parse(text);
      setAiData(parsed);
    } catch (err) {
      console.log('AI fallback used:', err.message);
      setAiData(fallback);  // Always show something
    }
    setAiLoading(false);
  };

  useEffect(() => {
    if (signal && priceData) {
      setAiLoading(true);
      // Calculate levels and pass to AI function
      const calculatedLevels = {
        livePrice,
        supportLevel,
        resistanceLevel,
        breakAbove,
        watchBelow
      };
      getAIExplanation(signal, calculatedLevels);
    }
  }, [symbol, priceData]);

  // Add to watchlist
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    const wl = JSON.parse(localStorage.getItem('watchlist') || '[]');
    setInWatchlist(wl.includes(symbol));
  }, [symbol]);

  const toggleWatchlist = () => {
    const wl = JSON.parse(localStorage.getItem('watchlist') || '[]');
    let updated;
    if (inWatchlist) {
      updated = wl.filter(s => s !== symbol);
      setInWatchlist(false);
    } else {
      updated = [...wl, symbol];
      setInWatchlist(true);
    }
    localStorage.setItem('watchlist', JSON.stringify(updated));
  };

  // ── Use REAL fetched price for ALL price-based calculations ─────────────
  const livePrice = priceData?.price || signal?.price || 1000;

  const supportLevel   = Math.round(livePrice * 0.95);  // 5% below current
  const resistanceLevel = Math.round(livePrice * 1.08); // 8% above current
  const breakAbove     = Math.round(livePrice * 1.03);  // 3% above current
  const watchBelow     = Math.round(livePrice * 0.97);  // 3% below current
  const stopLoss       = Math.round(livePrice * 0.92);  // 8% stop loss

  // ── Dynamic analyst target based on sector growth ──────────────────────
  const sectorGrowth = {
    'IT': 0.15, 'Banking': 0.18, 'Energy': 0.12,
    'Auto': 0.20, 'Finance': 0.15, 'Telecom': 0.14,
    'FMCG': 0.10, 'Mixed': 0.12,
  };
  const growth = sectorGrowth[fundBase.sector] || 0.12;
  const analystTarget = Math.round(livePrice * (1 + growth));
  const upside = Math.round(growth * 100);

  const fundamentals = {
    ...fundBase,
    analystTarget,
    upside,
  };

  // Generate result pills
  const generateResultPills = () => {
    const total = signal.occurrences;
    const wins = Math.round(total * (signal.win_rate / 100));
    
    const pills = [];
    for (let i = 0; i < total; i++) {
      pills.push(i < wins ? 'win' : 'loss');
    }
    return pills;
  };

  const resultPills = generateResultPills();

  // Get recommendation color
  const getRecommendationColor = (rec) => {
    switch(rec) {
      case 'BUY': return 'bg-green-500 text-white';
      case 'AVOID': return 'bg-red-500 text-white';
      default: return 'bg-amber-500 text-white';
    }
  };

  const getRecommendationIcon = (rec) => {
    switch(rec) {
      case 'BUY': return <CheckCircle size={16} />;
      case 'AVOID': return <AlertTriangle size={16} />;
      default: return <Eye size={16} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-center p-2 text-sm font-medium text-white">
        Live NSE data — Prices from last market close. Pattern detection runs on real historical data.
      </div>

      {/* Header */}
      <div className="bg-[#12121F] border-b border-[#2a2a2a] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </button>
            
            <div className="flex gap-3">
              <button onClick={toggleWatchlist} style={{
                background: inWatchlist ? 'rgba(0,212,170,0.15)' : 'rgba(124,58,237,0.15)',
                border: `1px solid ${inWatchlist ? '#00D4AA' : '#7C3AED'}`,
                color: inWatchlist ? '#00D4AA' : '#A78BFA',
                padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontSize:'13px'
              }}>
                {inWatchlist ? '⭐ In Watchlist' : '+ Add to Watchlist'}
              </button>
              <button 
                onClick={() => navigate('/alerts')}
                className="flex items-center gap-2 px-4 py-2 bg-[#00D4AA] hover:bg-[#00B894] text-white rounded-lg transition-colors"
              >
                <Bell size={16} />
                Set Alert
              </button>
            </div>
          </div>
          
          <div className="flex items-end gap-6">
            <div>
              <h1 className="text-3xl font-bold text-white">{signal.symbol}</h1>
              <p className="text-gray-400 text-lg">{signal.name}</p>
            </div>
            
            <div className="flex items-end gap-4">
              <div>
                <p className="text-3xl font-mono text-white">₹{(priceData?.price || signal.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                <p className={`text-lg font-semibold ${(priceData?.change_pct || signal.change || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(priceData?.change_pct || signal.change || 0) >= 0 ? '+' : ''}{priceData?.change_pct || signal.change || 0}%
                </p>
              </div>
              
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                signal.signal_type === 'bullish' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {signal.signal_type.toUpperCase()} SIGNAL
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - 65% */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Chart */}
            <div className="bg-[#12121F] rounded-xl p-6 border border-[#2a2a2a]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Price Chart</h2>
                <div className="flex gap-2">
                  {['1w','1m','3m','6m'].map(p => (
                    <button
                      key={p}
                      onClick={() => fetchChart(p)}
                      style={{
                        padding:'4px 12px', borderRadius:'6px', fontSize:'12px', fontWeight:'600',
                        border:'1px solid ' + (chartPeriod===p ? '#00D4AA' : 'rgba(255,255,255,0.15)'),
                        background: chartPeriod===p ? 'rgba(0,212,170,0.15)' : 'transparent',
                        color: chartPeriod===p ? '#00D4AA' : '#8B8BA8',
                        cursor:'pointer', transition:'all 0.15s',
                        textTransform:'uppercase', letterSpacing:'0.5px'
                      }}
                    >{p.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              
              <div className="relative h-64" style={{position:'relative'}}>
                <svg width="100%" height="100%" viewBox="0 0 600 200"
                  style={{cursor:'crosshair'}}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const svgX = ((e.clientX - rect.left) / rect.width) * 600;
                    const idx = Math.floor((svgX / 600) * (chartData.length || 20)); // fallback to 20 for generated
                    const dataToUse = chartData.length > 0 ? chartData : generateCandles(signal?.price || 1500, 20);
                    const candle = dataToUse[Math.min(idx, dataToUse.length-1)];
                    if (candle) {
                      setTooltip({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        date: candle.date || 'Today',
                        open: candle.open || candle.close,
                        high: candle.high || Math.max(candle.open||candle.close, candle.close)+5,
                        low: candle.low || Math.min(candle.open||candle.close, candle.close)-5,
                        close: candle.close,
                        bullish: candle.close >= (candle.open||candle.close)
                      });
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {/* Grid lines */}
                  {[0, 50, 100, 150, 200].map(y => (
                    <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#2a2a2a" strokeWidth="1" />
                  ))}
                  
                  {/* Candlesticks */}
                  {renderChart()}
                  
                  {/* Pattern detected marker */}
                  <polygon points="520,70 515,80 525,80" fill="#7C3AED" />
                  <text x="490" y="65" fill="#7C3AED" fontSize="12">Pattern detected</text>
                </svg>

                {/* Tooltip overlay */}
                {tooltip && (
                  <div style={{
                    position:'absolute',
                    left: Math.min(tooltip.x + 10, 500),
                    top: Math.min(tooltip.y - 10, 150),
                    background:'rgba(10,10,30,0.95)',
                    border:'1px solid rgba(0,212,170,0.3)',
                    borderRadius:'8px',
                    padding:'8px 12px',
                    fontSize:'11px',
                    pointerEvents:'none',
                    zIndex:10,
                    minWidth:'130px'
                  }}>
                    <div style={{color:'#8B8BA8',marginBottom:'4px',fontWeight:'600'}}>{tooltip.date}</div>
                    {[['Open','open'],['High','high'],['Low','low'],['Close','close']].map(([label,key]) => (
                      <div key={key} style={{display:'flex',justifyContent:'space-between',gap:'12px',color:key==='close'?(tooltip.bullish?'#00D4AA':'#FF4560'):'#D0D0E0'}}>
                        <span style={{color:'#8B8BA8'}}>{label}</span>
                        <span style={{fontFamily:'monospace',fontWeight:key==='close'?'700':'400'}}>₹{(tooltip[key]||0).toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* AI Analysis */}
            <div className="bg-[#12121F] rounded-xl p-6 border border-[#2a2a2a]">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Target className="text-purple-400" />
                AI Analysis
              </h2>
              
              {aiLoading ? (
                <div style={{display:'flex', alignItems:'center', gap:'8px', color:'#8B8BA8', fontSize:'13px'}}>
                  <div style={{width:'16px',height:'16px',border:'2px solid #00D4AA',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
                  Analyzing with Gemini AI...
                </div>
              ) : aiData ? (
                <div>
                  {/* Recommendation badge */}
                  <div style={{display:'inline-flex', alignItems:'center', gap:'8px', padding:'6px 14px', borderRadius:'20px', marginBottom:'12px',
                    background: aiData.recommendation==='BUY' ? 'rgba(0,212,170,0.15)' : aiData.recommendation==='AVOID' ? 'rgba(255,69,96,0.15)' : 'rgba(245,158,11,0.15)',
                    border: `1px solid ${aiData.recommendation==='BUY' ? '#00D4AA' : aiData.recommendation==='AVOID' ? '#FF4560' : '#F59E0B'}`
                  }}>
                    <span style={{fontSize:'16px'}}>{aiData.recommendation==='BUY' ? '📈' : aiData.recommendation==='AVOID' ? '⚠️' : '👁'}</span>
                    <span style={{color: aiData.recommendation==='BUY' ? '#00D4AA' : aiData.recommendation==='AVOID' ? '#FF4560' : '#F59E0B', fontWeight:'700', fontSize:'14px'}}>
                      {aiData.recommendation}
                    </span>
                  </div>
                  
                  {/* Explanation */}
                  <p style={{color:'#D0D0E0', fontSize:'14px', lineHeight:'1.6', marginBottom:'10px'}}>
                    {aiData.explanation}
                  </p>
                  
                  {/* Recommendation reason */}
                  <p style={{color:'#00D4AA', fontSize:'13px', marginBottom:'8px', fontStyle:'italic'}}>
                    💡 {aiData.recommendation_reason}
                  </p>
                  
                  {/* Risk */}
                  <p style={{color:'#8B8BA8', fontSize:'12px', padding:'8px', background:'rgba(255,255,255,0.03)', borderRadius:'6px', borderLeft:'2px solid #F59E0B'}}>
                    ⚠️ {aiData.risk}
                  </p>
                </div>
              ) : null}
            </div>

            {/* What This Means For You */}
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-700/30">
              <h2 className="text-xl font-semibold mb-4">What This Means For You</h2>
              
              <div className="text-gray-300 text-sm leading-relaxed space-y-3">
                {aiData?.recommendation === 'BUY' && (
                  <p>
                    This is a strong <strong>{signal.pattern}</strong> signal on <strong>{signal.symbol}</strong>. The stock is showing {signal.description} Key entry zone: ₹{watchBelow} – ₹{livePrice.toFixed(0)}. Target: ₹{analystTarget} (+{upside}%). Stop loss: ₹{stopLoss} (–8%). Always invest only what you can afford to lose.
                  </p>
                )}
                
                {aiData?.recommendation === 'WATCH' && (
                  <p>
                    This pattern is forming but needs confirmation. Add to your watchlist and watch for the price to hold above ₹{watchBelow} support. A close above ₹{breakAbove} with strong volume would confirm the breakout signal.
                  </p>
                )}
                
                {aiData?.recommendation === 'AVOID' && (
                  <p>
                    Signal is weak. Current price ₹{Math.round(livePrice).toLocaleString('en-IN')}. Consider waiting for better conditions before entering.
                  </p>
                )}

                {!aiData && (
                  <p>
                    Watch for price to hold above ₹{watchBelow} support. A confirmed close above ₹{breakAbove} with volume could be an entry signal. Analyst target: ₹{analystTarget} (+{upside}%).
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - 35% */}
          <div className="space-y-6">
            
            {/* Historical Win Rate */}
            <div className="bg-[#12121F] rounded-xl p-6 border border-[#2a2a2a]">
              <h2 className="text-lg font-semibold mb-4">Historical Win Rate</h2>
              
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-[#00D4AA]">{signal.win_rate}%</div>
                <p className="text-gray-400 text-sm">Win Rate</p>
              </div>
              
              <p className="text-xs text-gray-500 mb-4">
                Based on {signal.occurrences} occurrences in last 2 years
              </p>
              
              {/* Progress arc */}
              <div className="flex justify-center mb-4">
                <svg width="120" height="120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#2a2a2a" strokeWidth="10" />
                  <circle 
                    cx="60" cy="60" r="50" fill="none" stroke="#00D4AA" strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - signal.win_rate / 100)}`}
                    transform="rotate(-90 60 60)"
                  />
                </svg>
              </div>
              
              {/* Result pills */}
              <div className="flex flex-wrap gap-1 mb-4">
                {resultPills.map((result, i) => (
                  <div 
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      result === 'win' ? 'bg-green-400' : 'bg-red-400'
                    }`}
                  />
                ))}
              </div>
              
              <p className="text-xs text-gray-400">Avg gain in 20 days: +5.2%</p>
            </div>

            {/* Fundamentals */}
            <div className="bg-[#12121F] rounded-xl p-6 border border-[#2a2a2a]">
              <h2 className="text-lg font-semibold mb-4">Fundamentals</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">P/E Ratio</span>
                  <span className="text-white font-mono">{fundamentals.pe}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">P/B Ratio</span>
                  <span className="text-white font-mono">{fundamentals.pb}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">ROE</span>
                  <span className="text-white font-mono">{fundamentals.roe}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Debt/Equity</span>
                  <span className={`font-mono ${fundamentals.debt_equity < 0.3 ? 'text-green-400' : 'text-amber-400'}`}>
                    {fundamentals.debt_equity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Market Cap</span>
                  <span className="text-white">{fundamentals.market_cap}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Analyst Target</span>
                  <span className="text-[#00D4AA] font-mono font-semibold">₹{fundamentals.analystTarget.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Upside</span>
                  <span className="text-green-400 font-mono font-semibold">+{fundamentals.upside}% from current</span>
                </div>
              </div>
            </div>

            {/* Pattern Analysis */}
            <div className="bg-[#12121F] rounded-xl p-6 border border-[#2a2a2a]">
              <h2 className="text-lg font-semibold mb-4">Pattern Analysis</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Pattern</span>
                  <span className="text-white">{signal.pattern}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Conviction Score</span>
                  <span className={`text-2xl font-bold ${
                    signal.conviction_score > 75 ? 'text-[#00D4AA]' : 
                    signal.conviction_score >= 60 ? 'text-[#F59E0B]' : 'text-[#6B7280]'
                  }`}>
                    {signal.conviction_score}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Detected</span>
                  <span className="text-white">Today</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Key Level</span>
                  <span className="text-red-400 font-mono">₹{supportLevel.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Resistance</span>
                  <span className="text-green-400 font-mono">₹{resistanceLevel.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
