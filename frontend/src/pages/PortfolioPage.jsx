import { useState, useEffect } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Brain, AlertCircle, CheckCircle, ArrowUp, ArrowDown, X, TrendingDown as TrendIcon, BarChart3, Activity } from 'lucide-react';
import { MOCK_SIGNALS } from '../data/mockSignals';

// Add CSS animation for pulsing dot
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }
  .pulse-dot {
    animation: pulse-dot 2s infinite;
  }
`;
document.head.appendChild(style);

// Helper Components
const MiniSparkline = ({ prices, isPositive }) => {
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const range = maxPrice - minPrice;
  
  const points = prices.map((price, i) => {
    const x = (i / (prices.length - 1)) * 200;
    const y = ((maxPrice - price) / range) * 40;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="200" height="40" viewBox="0 0 200 40" className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? "#1CBFA0" : "#EF4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const DonutChart = ({ holdings }) => {
  const total = holdings.reduce((s, h) => s + h.qty * h.currentPrice, 0);
  const colors = ["#1CBFA0", "#7C3AED", "#F59E0B"];
  
  let cumulativePercentage = 0;
  const segments = holdings.slice(0, 3).map((holding, index) => {
    const percentage = (holding.qty * holding.currentPrice) / total * 100;
    const startAngle = cumulativePercentage * 3.6;
    const endAngle = (cumulativePercentage + percentage) * 3.6;
    cumulativePercentage += percentage;
    
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    
    const x1 = 50 + 28 * Math.cos(startRad);
    const y1 = 50 + 28 * Math.sin(startRad);
    const x2 = 50 + 28 * Math.cos(endRad);
    const y2 = 50 + 28 * Math.sin(endRad);
    
    const largeArc = percentage > 50 ? 1 : 0;
    
    return {
      path: `M 50 50 L ${x1} ${y1} A 28 28 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: colors[index % colors.length]
    };
  });

  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      {segments.map((segment, i) => (
        <path key={i} d={segment.path} fill={segment.color} />
      ))}
      <circle cx="50" cy="50" r="25" fill="#0A0F1E" />
      <text x="50" y="45" textAnchor="middle" fill="#1CBFA0" fontSize="10" fontWeight="bold">
        {holdings.length}
      </text>
      <text x="50" y="58" textAnchor="middle" fill="#1CBFA0" fontSize="10" fontWeight="bold">
        stocks
      </text>
    </svg>
  );
};

const PortfolioPage = () => {
  const [holdings, setHoldings] = useState(JSON.parse(localStorage.getItem('portfolio') || '[]'));
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStock, setNewStock] = useState({ symbol: '', qty: '', buyPrice: '' });
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [currentPrices, setCurrentPrices] = useState({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [showChartModal, setShowChartModal] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [showSignalModal, setShowSignalModal] = useState(false);

  // Fetch real-time prices for all portfolio stocks
  const fetchRealTimePrices = async () => {
    if (holdings.length === 0) return;
    
    setPricesLoading(true);
    const symbols = holdings.map(h => h.symbol);
    const prices = {};
    
    for (const symbol of symbols) {
      try {
        const response = await fetch(`http://localhost:8000/api/stock-price/${symbol}`);
        const data = await response.json();
        if (!data.error) {
          prices[symbol] = data.price;
        }
      } catch (error) {
        console.log(`Failed to fetch price for ${symbol}`);
        // Fallback to buy price if API fails
        const holding = holdings.find(h => h.symbol === symbol);
        if (holding) {
          prices[symbol] = holding.buyPrice;
        }
      }
    }
    
    setCurrentPrices(prices);
    
    // Update holdings with real-time prices
    setHoldings(prevHoldings => 
      prevHoldings.map(holding => ({
        ...holding,
        currentPrice: prices[holding.symbol] || holding.currentPrice
      }))
    );
    
    setPricesLoading(false);
  };

  // Fetch prices on component mount and when holdings change
  useEffect(() => {
    if (holdings.length > 0) {
      fetchRealTimePrices();
      
      // Set up periodic price refresh every 30 seconds
      const priceInterval = setInterval(fetchRealTimePrices, 30000);
      return () => clearInterval(priceInterval);
    }
  }, [holdings.length]);

  const addHolding = async () => {
    if (!newStock.symbol || !newStock.qty || !newStock.buyPrice) return;
    
    // Fetch real-time price for the new stock
    let currentPrice = parseFloat(newStock.buyPrice); // fallback to buy price
    try {
      const response = await fetch(`http://localhost:8000/api/stock-price/${newStock.symbol.toUpperCase()}`);
      const data = await response.json();
      if (!data.error) {
        currentPrice = data.price;
      }
    } catch (error) {
      console.log(`Failed to fetch price for ${newStock.symbol}, using buy price`);
    }
    
    const holding = {
      symbol: newStock.symbol.toUpperCase(),
      qty: parseInt(newStock.qty),
      buyPrice: parseFloat(newStock.buyPrice),
      currentPrice,
      addedOn: new Date().toLocaleDateString('en-IN')
    };
    const updated = [...holdings, holding];
    setHoldings(updated);
    localStorage.setItem('portfolio', JSON.stringify(updated));
    setNewStock({ symbol: '', qty: '', buyPrice: '' });
    setShowAddForm(false);
  };

  const removeHolding = (idx) => {
    const updated = holdings.filter((_, i) => i !== idx);
    setHoldings(updated);
    localStorage.setItem('portfolio', JSON.stringify(updated));
  };

  // Calculate totals
  const totalInvested = holdings.reduce((s, h) => s + h.qty * h.buyPrice, 0);
  const totalCurrent = holdings.reduce((s, h) => s + h.qty * h.currentPrice, 0);
  const totalPnL = totalCurrent - totalInvested;
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested * 100).toFixed(2) : 0;

  const getAIPortfolioAnalysis = async () => {
    if (holdings.length === 0) {
      alert('Add some stocks to your portfolio first!');
      return;
    }
    setAnalysisLoading(true);
    setAiAnalysis(null);
    
    const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    
    const holdingsSummary = holdings.map(h => {
      const pnlPct = (((h.currentPrice - h.buyPrice) / h.buyPrice) * 100).toFixed(1);
      return `${h.symbol}: ${h.qty} shares, bought at ₹${h.buyPrice}, now ₹${h.currentPrice} (${pnlPct >= 0 ? '+' : ''}${pnlPct}%)`;
    }).join('\n');
    
    const totalInvested = holdings.reduce((s,h) => s + h.qty*h.buyPrice, 0);
    const totalCurrent = holdings.reduce((s,h) => s + h.qty*h.currentPrice, 0);
    const totalReturn = ((totalCurrent-totalInvested)/totalInvested*100).toFixed(1);
    
    // Build fallback first (always use this if API fails)
    const sectors = holdings.map(h => {
      const sectorMap = {RELIANCE:'Energy',HDFCBANK:'Banking',ICICIBANK:'Banking',AXISBANK:'Banking',SBIN:'Banking',KOTAKBANK:'Banking',TCS:'IT',INFY:'IT',WIPRO:'IT',MARUTI:'Auto',TATAMOTORS:'Auto',SUNPHARMA:'Pharma',DRREDDY:'Pharma',HINDUNILVR:'FMCG',ASIANPAINT:'FMCG',NTPC:'Energy',ONGC:'Energy',BHARTIARTL:'Telecom'};
      return sectorMap[h.symbol] || 'Mixed';
    });
    const sectorCounts = sectors.reduce((acc,s) => ({...acc,[s]:(acc[s]||0)+1}),{});
    const topSector = Object.entries(sectorCounts).sort((a,b)=>b[1]-a[1])[0];
    
    const fallbackInsights = [
      holdings.length < 3 ? `Your portfolio has only ${holdings.length} stock${holdings.length>1?'s':''} — diversifying across 5-8 stocks can reduce risk significantly.` : `Good start with ${holdings.length} stocks. Aim for 8-12 stocks across different sectors for optimal diversification.`,
      topSector && topSector[1] > 1 ? `You have ${topSector[1]} stocks from ${topSector[0]} sector — that's ${Math.round(topSector[1]/holdings.length*100)}% concentration. Consider balancing across Banking, IT, FMCG, and Energy.` : 'Your sector allocation looks reasonably balanced across different industries.',
      parseFloat(totalReturn) > 0 ? `Your portfolio is up ${totalReturn}% overall — solid performance! Continue monitoring signals for your held stocks to know when to hold vs book profits.` : `Your portfolio is down ${Math.abs(totalReturn)}%. Check if the fundamentals have changed or if this is temporary market volatility before making decisions.`
    ];
    
    const healthScore = Math.min(100, Math.max(30,
      (holdings.length >= 5 ? 30 : holdings.length * 6) +
      (parseFloat(totalReturn) > 0 ? 25 : 10) +
      (Object.keys(sectorCounts).length >= 3 ? 25 : Object.keys(sectorCounts).length * 8) +
      20
    ));
    
    const fallback = {
      score: healthScore,
      insights: fallbackInsights,
      summary: parseFloat(totalReturn) >= 0 ? `Portfolio performing positively with ${totalReturn}% overall return.` : `Portfolio needs attention — focus on quality stocks with strong signals.`
    };
    
    if (!GEMINI_KEY || GEMINI_KEY.length < 10) {
      setTimeout(() => { setAiAnalysis(fallback); setAnalysisLoading(false); }, 1000);
      return;
    }
    
    const prompt = `Analyze this Indian retail investor portfolio briefly. 
Holdings:
${holdingsSummary}
Total invested: ₹${Math.round(totalInvested).toLocaleString('en-IN')}
Total current value: ₹${Math.round(totalCurrent).toLocaleString('en-IN')}
Overall return: ${totalReturn}%

Give health score (0-100) and 3 specific short insights (each under 20 words).
Return ONLY this JSON (no markdown):
{"score":75,"insights":["insight1","insight2","insight3"],"summary":"one sentence summary"}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
        {method:'POST', headers:{'Content-Type':'application/json'},
         body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:200,temperature:0.5}})}
      );
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      text = text.replace(/```json/g,'').replace(/```/g,'').trim();
      const parsed = JSON.parse(text);
      setAiAnalysis({...fallback,...parsed});
    } catch {
      setAiAnalysis(fallback);
    }
    setAnalysisLoading(false);
  };

  // Filter signals for user's stocks and update with real prices
  const mySignals = MOCK_SIGNALS.filter(s => holdings.some(h => h.symbol === s.symbol)).map(signal => {
    const holding = holdings.find(h => h.symbol === signal.symbol);
    return {
      ...signal,
      price: holding ? holding.currentPrice : signal.price
    };
  });

  // Mock sparkline data for each stock - updated to use real prices as base
  const getSparklineData = (symbol) => {
    const currentStock = holdings.find(h => h.symbol === symbol);
    const realCurrentPrice = currentStock ? currentStock.currentPrice : 1000;
    
    // Generate realistic 7-day data based on current price
    const baseData = [];
    let price = realCurrentPrice * 0.98; // Start 2% below current
    
    for (let i = 0; i < 7; i++) {
      const change = price * ((Math.random() - 0.5) * 0.03); // ±1.5% daily change
      price = Math.max(price * 0.97, Math.min(price * 1.03, price + change));
      baseData.push(price);
    }
    
    // Ensure last price matches current price
    baseData[6] = realCurrentPrice;
    
    return baseData;
  };

  const FULL_NAMES = {
    RELIANCE: 'Reliance Industries Ltd',
    HDFCBANK: 'HDFC Bank Ltd', 
    TCS: 'Tata Consultancy Services',
    INFY: 'Infosys Ltd',
    SBIN: 'State Bank of India',
    TATAMOTORS: 'Tata Motors Ltd',
    WIPRO: 'Wipro Ltd',
    ICICIBANK: 'ICICI Bank Ltd',
    BAJFINANCE: 'Bajaj Finance Ltd',
    BHARTIARTL: 'Bharti Airtel Ltd',
    NTPC: 'NTPC Ltd',
    ONGC: 'Oil & Natural Gas Corp',
    AXISBANK: 'Axis Bank Ltd',
    MARUTI: 'Maruti Suzuki India Ltd',
    KOTAKBANK: 'Kotak Mahindra Bank Ltd'
  };
  
  const getFullName = (sym) => FULL_NAMES[sym] || sym;

  // Win rate bar color functions
  const getBarColor = (winRate) => {
    if (winRate >= 65) return 'linear-gradient(90deg, #0F6E56, #1CBFA0)';
    if (winRate >= 55) return 'linear-gradient(90deg, #854F0B, #F59E0B)';
    return 'linear-gradient(90deg, #7F1D1D, #EF4444)';
  };

  const getBarTextColor = (winRate) => {
    if (winRate >= 65) return '#1CBFA0';
    if (winRate >= 55) return '#F59E0B';
    return '#EF4444';
  };

  const getMaxReturn = () => {
    return Math.max(...holdings.map(h => Math.abs(((h.currentPrice - h.buyPrice) / h.buyPrice) * 100)));
  };

  // Generate extended chart data for modal
  const getChartData = (symbol) => {
    const baseData = getSparklineData(symbol);
    const currentStock = holdings.find(h => h.symbol === symbol);
    const realCurrentPrice = currentStock ? currentStock.currentPrice : baseData[baseData.length - 1];
    
    // Generate 30 days of historical data with realistic patterns based on real price
    const extendedData = [];
    let currentPrice = realCurrentPrice * 0.95; // Start 5% below current price
    
    for (let i = 0; i < 30; i++) {
      const volatility = 0.015 + Math.random() * 0.025; // 1.5-4% daily volatility
      const trend = i < 15 ? 0.0008 : -0.0003; // Slight uptrend then downtrend
      const change = currentPrice * (trend + (Math.random() - 0.5) * volatility);
      currentPrice = Math.max(currentPrice * 0.96, Math.min(currentPrice * 1.04, currentPrice + change));
      extendedData.push(currentPrice);
    }
    
    // Ensure the last 7 days match our sparkline data
    for (let i = 0; i < baseData.length; i++) {
      extendedData[29 - (baseData.length - 1 - i)] = baseData[i];
    }
    
    return extendedData;
  };

  const handleViewChart = async (stock) => {
    setSelectedStock(stock);
    
    // Fetch real-time historical data for chart
    try {
      const response = await fetch(`http://localhost:8000/api/stock-price/${stock.symbol}`);
      const data = await response.json();
      if (!data.error) {
        // Update stock with real-time price
        const updatedStock = { ...stock, currentPrice: data.price };
        setSelectedStock(updatedStock);
        
        // Update holdings with new price
        setHoldings(prevHoldings => 
          prevHoldings.map(h => 
            h.symbol === stock.symbol 
              ? { ...h, currentPrice: data.price }
              : h
          )
        );
      }
    } catch (error) {
      console.log('Failed to fetch real-time price for chart');
    }
    
    setShowChartModal(true);
  };

  const handleViewSignal = async (signal) => {
    // Fetch real-time price for the signal
    try {
      const response = await fetch(`http://localhost:8000/api/stock-price/${signal.symbol}`);
      const data = await response.json();
      if (!data.error) {
        const updatedSignal = { ...signal, price: data.price };
        setSelectedSignal(updatedSignal);
      } else {
        setSelectedSignal(signal);
      }
    } catch (error) {
      console.log('Failed to fetch real-time price for signal');
      setSelectedSignal(signal);
    }
    
    setShowSignalModal(true);
  };

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white">
      <div className="max-w-[1200px] mx-auto px-6 py-6">
        
        {/* SECTION 1: PAGE HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-[28px] font-bold text-white mb-1">My Portfolio</h1>
            <p className="text-[12px] text-gray-400">
              Live prices · Last updated {pricesLoading ? 'updating...' : 'just now'}
            </p>
          </div>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-[#1CBFA0] hover:bg-[#1AA085] text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Add Stock
            </button>
          )}
        </div>

        {/* Stats Bar */}
        {holdings.length > 0 && (
          <div className="flex items-center gap-6 mb-6 py-3 bg-[#111827] rounded-lg px-6">
            <div className="text-center">
              <p className="text-[11px] text-gray-400">Total Invested</p>
              <p className="text-[16px] font-bold text-white">₹{totalInvested.toLocaleString('en-IN')}</p>
            </div>
            <div className="w-px h-8 bg-gray-600"></div>
            <div className="text-center">
              <p className="text-[11px] text-gray-400">Current Value</p>
              <p className="text-[16px] font-bold text-white">₹{totalCurrent.toLocaleString('en-IN')}</p>
            </div>
            <div className="w-px h-8 bg-gray-600"></div>
            <div className="text-center">
              <p className="text-[11px] text-gray-400">Total P&L</p>
              <p className={`text-[16px] font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ₹{totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(0)}
              </p>
            </div>
            <div className="w-px h-8 bg-gray-600"></div>
            <div className="text-center">
              <p className="text-[11px] text-gray-400">Today's Change</p>
              <p className={`text-[16px] font-bold ${totalPnLPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalPnLPct >= 0 ? '+' : ''}{totalPnLPct}%
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {holdings.length === 0 && !showAddForm && (
          <div className="bg-[#111827] rounded-2xl p-16 border border-gray-800 text-center">
            <div className="text-gray-400 mb-6">
              <TrendingUp size={48} className="mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Your portfolio is empty</h2>
              <p>Add stocks you own to track them and get AI analysis.</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-[#1CBFA0] hover:bg-[#1AA085] text-white px-6 py-3 rounded-lg transition-colors"
            >
              + Add Your First Stock
            </button>
          </div>
        )}

        {/* Add Stock Form */}
        {showAddForm && (
          <div className="bg-[#111827] rounded-2xl p-6 border border-gray-800 mb-6">
            <h3 className="text-xl font-semibold mb-4">Add New Stock</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Stock Symbol"
                value={newStock.symbol}
                onChange={(e) => setNewStock({ ...newStock, symbol: e.target.value.toUpperCase() })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
              <input
                type="number"
                placeholder="Quantity"
                value={newStock.qty}
                onChange={(e) => setNewStock({ ...newStock, qty: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
              <input
                type="number"
                placeholder="Buy Price"
                value={newStock.buyPrice}
                onChange={(e) => setNewStock({ ...newStock, buyPrice: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={addHolding}
                  className="flex-1 bg-[#1CBFA0] hover:bg-[#1AA085] text-white py-2 rounded-lg transition-colors"
                >
                  Add to Portfolio
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewStock({ symbol: '', qty: '', buyPrice: '' });
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: PORTFOLIO SUMMARY CARD */}
        {holdings.length > 0 && (
          <div className="bg-[#111827] rounded-2xl p-6 mb-6" style={{ borderLeft: '4px solid #1CBFA0' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <DonutChart holdings={holdings} />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${totalPnL >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {totalPnL >= 0 ? 'Profitable Portfolio' : 'Loss Portfolio'}
                    </span>
                    {totalPnL >= 0 ? <ArrowUp className="text-green-400" size={20} /> : <ArrowDown className="text-red-400" size={20} />}
                  </div>
                  <p className={`text-[36px] font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ₹{totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(0)}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg px-4 py-2">
                  <p className="text-[11px] text-gray-400">Total Invested</p>
                  <p className="text-[14px] font-bold text-white">₹{totalInvested.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-gray-800 rounded-lg px-4 py-2">
                  <p className="text-[11px] text-gray-400">Current Value</p>
                  <p className="text-[14px] font-bold text-white">₹{totalCurrent.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-gray-800 rounded-lg px-4 py-2">
                  <p className="text-[11px] text-gray-400">XIRR (estimated)</p>
                  <p className="text-[14px] font-bold text-white">Est. {totalPnLPct >= 0 ? '+' : ''}{totalPnLPct}% overall</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: STOCK CARDS - 3 COLUMN GRID */}
        {holdings.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {holdings.map((holding, idx) => {
              const pnl = (holding.currentPrice - holding.buyPrice) * holding.qty;
              const pnlPct = ((holding.currentPrice - holding.buyPrice) / holding.buyPrice * 100).toFixed(2);
              const isPositive = pnl >= 0;
              const sparklineData = getSparklineData(holding.symbol);
              const maxReturn = getMaxReturn();
              const barWidth = maxReturn > 0 ? Math.abs(pnlPct) / maxReturn * 100 : 1;
              const barColor = pnlPct > 0 ? '#1CBFA0' : pnlPct < 0 ? '#EF4444' : '#4B5563';
              
              return (
                <div key={idx} className="bg-[#111827] rounded-2xl p-4 border border-gray-700 hover:border-[#1CBFA0] transition-colors">
                  {/* TOP SECTION - 3 COLUMN FLEX */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex-1">
                      <h3 className="text-[14px] font-bold text-white">{holding.symbol}</h3>
                      <p className="text-[10px] text-gray-400">{getFullName(holding.symbol)}</p>
                    </div>
                    <div className="flex-1 flex justify-center">
                      <MiniSparkline prices={sparklineData} isPositive={isPositive} />
                    </div>
                    <div className="flex-1 text-right">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isPositive ? 'PROFIT' : 'LOSS'}
                      </span>
                      <p className="text-[14px] font-bold text-white mt-1">₹{holding.currentPrice.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* MIDDLE SECTION - COMPACT 2x2 GRID */}
                  <div className="grid grid-cols-2 gap-px bg-[#1F2937] rounded-lg overflow-hidden mb-3">
                    <div className="bg-[#0F172A] p-2 text-center">
                      <p className="text-[12px] text-gray-400">Buy Price</p>
                      <p className="text-[13px] font-bold text-white">₹{holding.buyPrice.toFixed(2)}</p>
                    </div>
                    <div className="bg-[#0F172A] p-2 text-center">
                      <p className="text-[12px] text-gray-400">Qty</p>
                      <p className="text-[13px] font-bold text-white">{holding.qty}</p>
                    </div>
                    <div className="bg-[#0F172A] p-2 text-center">
                      <p className="text-[12px] text-gray-400">Current Price</p>
                      <p className="text-[13px] font-bold text-white flex items-center justify-center gap-1">
                        ₹{holding.currentPrice.toFixed(2)}
                        {holding.currentPrice > holding.buyPrice ? <ArrowUp className="text-green-400" size={12} /> : <ArrowDown className="text-red-400" size={12} />}
                      </p>
                    </div>
                    <div className="bg-[#0F172A] p-2 text-center">
                      <p className="text-[12px] text-gray-400">P&L</p>
                      <p className={`text-[13px] font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        ₹{pnl.toFixed(0)} ({isPositive ? '+' : ''}{pnlPct}%)
                      </p>
                    </div>
                  </div>

                  {/* BOTTOM SECTION - PROGRESS BAR */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] text-gray-400">Return: {isPositive ? '+' : ''}{pnlPct}%</p>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full"
                        style={{ width: `${barWidth}%`, backgroundColor: barColor }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <button 
                      onClick={() => handleViewChart(holding)}
                      className="text-[10px] text-[#1CBFA0] hover:text-[#1AA085] transition-colors"
                    >
                      View Chart →
                    </button>
                    <button
                      onClick={() => removeHolding(idx)}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SECTION 4: ACTIVE SIGNALS PANEL */}
        {mySignals.length > 0 && (
          <div className="bg-[#111827] rounded-2xl p-6 border border-gray-800 mb-6" style={{ marginBottom: '24px' }}>
            <h3 className="text-xl font-semibold mb-4">Active Signals on Your Stocks</h3>
            <div className="grid grid-cols-2 gap-3">
              {mySignals.map((signal) => (
                <div key={signal.symbol} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-white">{signal.symbol}</h4>
                      <p className="text-sm text-[#1CBFA0]">{signal.pattern}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full pulse-dot"></div>
                      <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                        ACTIVE
                      </span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Win Rate:</span>
                      <span className="font-bold" style={{ color: getBarTextColor(signal.win_rate) }}>
                        {signal.win_rate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${signal.win_rate}%`,
                          background: getBarColor(signal.win_rate)
                        }}
                      ></div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleViewSignal(signal)}
                    className="text-[12px] text-[#1CBFA0] hover:text-[#1AA085] transition-colors"
                  >
                    View Signal →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 5: AI PORTFOLIO ANALYSIS SECTION */}
        <div className="bg-[#1A1040] rounded-2xl p-6 border border-purple-800" style={{ borderRadius: '16px', border: '0.5px solid #1F2937' }}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Brain className="text-purple-400" size={24} />
              <div>
                <h3 className="text-xl font-semibold text-white">AI Portfolio Analysis</h3>
                <p className="text-sm text-gray-400">Get personalized insights powered by Gemini AI</p>
              </div>
            </div>
            {!aiAnalysis && (
              <button
                onClick={getAIPortfolioAnalysis}
                disabled={analysisLoading}
                className="flex items-center gap-2 bg-gradient-to-r from-[#7C3AED] to-[#6B2FCD] hover:from-[#6B2FCD] hover:to-[#5B2FBD] disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-all"
              >
                <Brain size={16} />
                {analysisLoading ? 'Analyzing...' : 'Analyze with AI →'}
              </button>
            )}
          </div>

          {/* Teaser Insight Chips */}
          <div className="flex gap-3 mt-4">
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
              Portfolio Health: {aiAnalysis?.score > 70 ? 'Good' : aiAnalysis?.score > 50 ? 'Moderate' : 'Needs Attention'}
            </span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
              Diversification: {holdings.length < 3 ? 'Low' : holdings.length < 6 ? 'Moderate' : 'Good'}
            </span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
              Risk Level: {totalPnLPct > 0 ? 'Moderate' : 'High'}
            </span>
          </div>

          {/* AI Response Panel */}
          {analysisLoading && (
            <div className="text-center py-8">
              <Brain className="animate-pulse text-purple-400 mx-auto mb-4" size={48} />
              <p className="text-gray-400">Analyzing your portfolio...</p>
            </div>
          )}

          {aiAnalysis && (
            <div className="mt-6 space-y-4">
              <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-purple-300">Health Score</h4>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <svg width="60" height="60" className="transform -rotate-90">
                        <circle
                          cx="30"
                          cy="30"
                          r="25"
                          stroke="#374151"
                          strokeWidth="4"
                          fill="none"
                        />
                        <circle
                          cx="30"
                          cy="30"
                          r="25"
                          stroke={aiAnalysis.score < 50 ? '#EF4444' : aiAnalysis.score < 70 ? '#F59E0B' : '#1CBFA0'}
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray={`${(aiAnalysis.score / 100) * 157} 157`}
                          className="transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-lg font-bold ${aiAnalysis.score < 50 ? 'text-red-400' : aiAnalysis.score < 70 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {aiAnalysis.score}
                        </span>
                        <span className="text-xs text-gray-400">/100</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-700">
                <h4 className="font-semibold text-purple-300 mb-3">Key Insights</h4>
                <ul className="space-y-2">
                  {aiAnalysis.insights.map((insight, idx) => (
                    <li key={idx} className="text-sm text-gray-300 pl-3 border-l-2 border-purple-400">
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-700">
                <h4 className="font-semibold text-purple-300 mb-2">Summary</h4>
                <p className="text-sm text-gray-300">{aiAnalysis.summary}</p>
              </div>

              <button
                onClick={getAIPortfolioAnalysis}
                className="w-full bg-purple-800 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors"
              >
                Re-analyze Portfolio
              </button>
            </div>
          )}
        </div>

        {/* CHART MODAL */}
        {showChartModal && selectedStock && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#111827] rounded-2xl p-6 w-full max-w-4xl mx-4 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedStock.symbol}</h2>
                  <p className="text-gray-400">{getFullName(selectedStock.symbol)}</p>
                </div>
                <button
                  onClick={() => setShowChartModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Current Price</p>
                  <p className="text-lg font-bold text-white">₹{selectedStock.currentPrice.toFixed(2)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Buy Price</p>
                  <p className="text-lg font-bold text-white">₹{selectedStock.buyPrice.toFixed(2)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Quantity</p>
                  <p className="text-lg font-bold text-white">{selectedStock.qty}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400">P&L</p>
                  <p className={`text-lg font-bold ${((selectedStock.currentPrice - selectedStock.buyPrice) * selectedStock.qty) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ₹{((selectedStock.currentPrice - selectedStock.buyPrice) * selectedStock.qty).toFixed(0)}
                  </p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-4">30-Day Price Chart</h3>
                <div className="h-64">
                  <svg width="100%" height="100%" viewBox="0 0 800 256" className="w-full">
                    {(() => {
                      const chartData = getChartData(selectedStock.symbol);
                      const maxPrice = Math.max(...chartData);
                      const minPrice = Math.min(...chartData);
                      const range = maxPrice - minPrice;
                      
                      const points = chartData.map((price, i) => {
                        const x = (i / (chartData.length - 1)) * 800;
                        const y = ((maxPrice - price) / range) * 256;
                        return `${x},${y}`;
                      }).join(' ');

                      // Grid lines
                      const gridLines = [];
                      for (let i = 0; i <= 5; i++) {
                        const y = (i / 5) * 256;
                        gridLines.push(
                          <line key={`h-${i}`} x1="0" y1={y} x2="800" y2={y} stroke="#374151" strokeWidth="1" />
                        );
                        gridLines.push(
                          <text key={`hl-${i}`} x="10" y={y + 4} fill="#9CA3AF" fontSize="10">
                            ₹{(maxPrice - (range * i / 5)).toFixed(0)}
                          </text>
                        );
                      }

                      return (
                        <>
                          {gridLines}
                          <polyline
                            points={points}
                            fill="none"
                            stroke="#1CBFA0"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {chartData.map((price, i) => (
                            <circle
                              key={i}
                              cx={(i / (chartData.length - 1)) * 800}
                              cy={((maxPrice - price) / range) * 256}
                              r="2"
                              fill="#1CBFA0"
                            />
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowChartModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SIGNAL MODAL */}
        {showSignalModal && selectedSignal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#111827] rounded-2xl p-6 w-full max-w-2xl mx-4 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedSignal.symbol}</h2>
                  <p className="text-gray-400">Technical Analysis Signal</p>
                </div>
                <button
                  onClick={() => setShowSignalModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="text-[#1CBFA0]" size={20} />
                    <h3 className="font-semibold text-white">Pattern</h3>
                  </div>
                  <p className="text-[#1CBFA0] font-bold">{selectedSignal.pattern}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="text-[#1CBFA0]" size={20} />
                    <h3 className="font-semibold text-white">Win Rate</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-[#1CBFA0]">{selectedSignal.win_rate}%</span>
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-[#1CBFA0]"
                        style={{ width: `${selectedSignal.win_rate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-white mb-3">Signal Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current Price:</span>
                    <span className="text-white font-bold">₹{selectedSignal.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Conviction:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-700 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-[#1CBFA0]"
                          style={{ width: `${selectedSignal.conviction}%` }}
                        ></div>
                      </div>
                      <span className="text-white font-bold">{selectedSignal.conviction}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sector:</span>
                    <span className="text-white font-bold">{selectedSignal.sector}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Signal Type:</span>
                    <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-semibold">
                      ACTIVE
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-purple-900/30 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-purple-300 mb-2">AI Analysis</h3>
                <p className="text-sm text-gray-300">
                  This {selectedSignal.pattern.toLowerCase()} signal indicates a potential price movement. 
                  With a {selectedSignal.win_rate}% historical success rate, this pattern suggests 
                  {selectedSignal.win_rate > 70 ? ' strong confidence' : selectedSignal.win_rate > 50 ? ' moderate confidence' : ' lower confidence'} 
                  in the expected outcome. Consider this signal alongside other technical indicators 
                  and fundamental analysis for comprehensive decision-making.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowSignalModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  className="px-4 py-2 bg-[#1CBFA0] hover:bg-[#1AA085] text-white rounded-lg transition-colors"
                >
                  Add to Watchlist
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioPage;
