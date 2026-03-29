import { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, CheckCheck, AlertCircle, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { MOCK_SIGNALS } from '../data/mockSignals';

const AlertsPage = () => {
  const [alerts, setAlerts] = useState(JSON.parse(localStorage.getItem('alerts') || '[]'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({symbol:'', alertType:'pattern', condition:'RSI Divergence'});
  const [formError, setFormError] = useState('');
  const [currentPrices, setCurrentPrices] = useState({});
  const [pricesLoading, setPricesLoading] = useState(false);

  // Fetch real-time prices for all alert stocks
  const fetchRealTimePrices = async () => {
    if (alerts.length === 0) return;
    
    setPricesLoading(true);
    const symbols = [...new Set(alerts.map(a => a.symbol))];
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
        // Keep existing price if API fails
        const alert = alerts.find(a => a.symbol === symbol);
        if (alert) {
          prices[symbol] = alert.price;
        }
      }
    }
    
    setCurrentPrices(prices);
    
    // Update alerts with real-time prices
    setAlerts(prevAlerts => 
      prevAlerts.map(alert => ({
        ...alert,
        price: prices[alert.symbol] || alert.price
      }))
    );
    
    setPricesLoading(false);
  };

  // Fetch prices on component mount and when alerts change
  useEffect(() => {
    if (alerts.length > 0) {
      fetchRealTimePrices();
      
      // Set up periodic price refresh every 30 seconds
      const priceInterval = setInterval(fetchRealTimePrices, 30000);
      return () => clearInterval(priceInterval);
    }
  }, [alerts.length]);

  // Get signal data from MOCK_SIGNALS or defaults
  const getSignalData = (symbol) => {
    const mockSignal = MOCK_SIGNALS.find(s => s.symbol === symbol);
    return mockSignal || {
      win_rate: 60,
      pattern: 'Any pattern',
      conviction: 65,
      sector: 'Mixed'
    };
  };

  // Pre-populate with 3 demo alerts so page is never empty
  useEffect(() => {
    if (alerts.length === 0) {
      const demoAlerts = [
        {
          id: 1, symbol: 'RELIANCE', alertType: 'pattern', condition: 'RSI Divergence',
          status: 'triggered', triggeredAt: 'Today 9:15 AM', recommendation: 'BUY',
          winRate: 67, price: 0, notifyApp: true // Will be updated with real price
        },
        {
          id: 2, symbol: 'HDFCBANK', alertType: 'conviction', condition: 'above 70',
          status: 'watching', recommendation: 'WATCH',
          winRate: 72, price: 0, notifyApp: true // Will be updated with real price
        },
        {
          id: 3, symbol: 'TCS', alertType: 'price', condition: 'above ₹4000',
          status: 'watching', recommendation: 'WATCH',
          winRate: 61, price: 0, notifyApp: true // Will be updated with real price
        },
      ];
      setAlerts(demoAlerts);
      localStorage.setItem('alerts', JSON.stringify(demoAlerts));
    }
  }, []);

  const addAlert = async () => {
    if (!form.symbol) { setFormError('Please enter a stock symbol'); return; }
    const sym = form.symbol.toUpperCase().trim();
    const sigData = getSignalData(sym);
    
    // Fetch real-time price for the new alert
    let currentPrice = 0;
    try {
      const response = await fetch(`http://localhost:8000/api/stock-price/${sym}`);
      const data = await response.json();
      if (!data.error) {
        currentPrice = data.price;
      }
    } catch (error) {
      console.log(`Failed to fetch price for ${sym}, will fetch later`);
    }
    
    const winRate = sigData.win_rate || 60;
    const recommendation = winRate >= 70 ? 'BUY' : winRate >= 60 ? 'WATCH' : 'WATCH';
    
    const newAlert = {
      id: Date.now(),
      symbol: sym,
      alertType: form.alertType,
      condition: form.alertType === 'pattern' ? (sigData.pattern || 'Any pattern') :
                 form.alertType === 'conviction' ? 'above 70' :
                 form.alertType === 'price' ? `above ₹${Math.round(currentPrice * 1.05) || '4000'}` : 'any',
      status: 'watching',
      recommendation,
      winRate,
      price: currentPrice, // Will be updated if not fetched immediately
      occurrences: 10,
      notifyApp: true,
      notifyEmail: true,
      createdAt: new Date().toLocaleDateString('en-IN')
    };
    
    const updated = [...alerts, newAlert];
    setAlerts(updated);
    localStorage.setItem('alerts', JSON.stringify(updated));
    setShowForm(false);
    setForm({symbol:'', alertType:'pattern', condition:''});
    setFormError('');
  };

  const deleteAlert = (id) => {
    const updated = alerts.filter(a => a.id !== id);
    setAlerts(updated);
    localStorage.setItem('alerts', JSON.stringify(updated));
  };

  const activeAlerts = alerts.filter(a => a.status === 'watching').length;
  const triggeredToday = alerts.filter(a => a.status === 'triggered').length;
  const stocksWatching = new Set(alerts.map(a => a.symbol)).size;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-center p-2 text-sm font-medium text-white">
        Smart Alerts — Never Miss Market Signals
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Bell size={32} className="text-[#00D4AA]" />
            <div>
              <h1 className="text-3xl font-bold">Manage Alerts</h1>
              <div className="flex items-center gap-2">
                <p className="text-gray-400 text-sm">MarketLens AI</p>
                {alerts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${pricesLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                    <span className="text-sm text-gray-400">
                      {pricesLoading ? 'Updating prices...' : 'Live prices'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#00D4AA] hover:bg-[#00B894] text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={18} />
            New Alert
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#12121F] rounded-xl p-6 border border-[#2a2a2a]">
            <p className="text-gray-400 text-sm mb-2">Active Alerts</p>
            <p className="text-3xl font-bold text-[#00D4AA]">{activeAlerts}</p>
          </div>
          <div className="bg-[#12121F] rounded-xl p-6 border border-[#2a2a2a]">
            <p className="text-gray-400 text-sm mb-2">Triggered Today</p>
            <p className="text-3xl font-bold text-amber-400">{triggeredToday}</p>
          </div>
          <div className="bg-[#12121F] rounded-xl p-6 border border-[#2a2a2a]">
            <p className="text-gray-400 text-sm mb-2">Stocks Watching</p>
            <p className="text-3xl font-bold text-[#7C3AED]">{stocksWatching}</p>
          </div>
        </div>

        {/* Add Alert Form */}
        {showForm && (
          <div style={{background:'#1A1A2E',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
            <h3 style={{color:'white',marginBottom:'16px',fontSize:'15px'}}>Create New Alert</h3>
            
            {formError && <div style={{color:'#FF4560',fontSize:'12px',marginBottom:'8px'}}>{formError}</div>}
            
            <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginBottom:'12px'}}>
              <div style={{flex:1,minWidth:'140px'}}>
                <label style={{color:'#8B8BA8',fontSize:'12px',display:'block',marginBottom:'4px'}}>Stock Symbol</label>
                <input value={form.symbol} onChange={e=>setForm({...form,symbol:e.target.value.toUpperCase()})}
                  placeholder="e.g. RELIANCE"
                  style={{width:'100%',background:'#12121F',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'8px',padding:'8px 12px',color:'white',fontSize:'13px'}}/>
              </div>
              <div style={{flex:1,minWidth:'140px'}}>
                <label style={{color:'#8B8BA8',fontSize:'12px',display:'block',marginBottom:'4px'}}>Alert Type</label>
                <select value={form.alertType} onChange={e=>setForm({...form,alertType:e.target.value})}
                  style={{width:'100%',background:'#12121F',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'8px',padding:'8px 12px',color:'white',fontSize:'13px'}}>
                  <option value="pattern">Pattern Detected</option>
                  <option value="conviction">Conviction Above 70</option>
                  <option value="price">Price Target</option>
                </select>
              </div>
            </div>
            
            <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
              <button onClick={addAlert} style={{background:'#00D4AA',color:'#060611',border:'none',borderRadius:'8px',padding:'10px 20px',fontWeight:'700',cursor:'pointer',fontSize:'13px'}}>
                + Create Alert
              </button>
              <button onClick={()=>setShowForm(false)} style={{background:'transparent',color:'#8B8BA8',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'10px 20px',cursor:'pointer',fontSize:'13px'}}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Alerts List */}
        <div className="space-y-4 mb-8">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-[#12121F] rounded-xl p-6 border-l-4 ${
                alert.status === 'triggered'
                  ? 'border-l-[#00D4AA] border-l-4'
                  : 'border-l-[#F59E0B] border-l-4'
              }`}
            >
              {/* Alert Triggered Banner */}
              {alert.status === 'triggered' && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400 text-sm font-medium">
                    ⚡ Alert Triggered! {alert.symbol} — {alert.condition} detected at {alert.triggeredAt}
                  </span>
                </div>
              )}

              {/* Alert Content */}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* Top Row */}
                  <div className="flex items-center gap-3 mb-3">
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#00D4AA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: '700', color: '#060611' }}>
                      ML
                    </div>
                    <h3 className="text-xl font-bold">{alert.symbol}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      alert.status === 'triggered'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {alert.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Middle Row */}
                  <div className="text-gray-300 mb-3">
                    Notify when: <span className="text-white font-medium">{alert.alertType}</span> — <span className="text-white font-medium">{alert.condition}</span>
                  </div>

                  {/* Bottom Row */}
                  <div className="flex items-center gap-6">
                    {/* Recommendation Badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      alert.recommendation === 'BUY'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : alert.recommendation === 'SELL'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {alert.recommendation === 'BUY' && '📈 BUY SIGNAL'}
                      {alert.recommendation === 'SELL' && '📉 SELL SIGNAL'}
                      {alert.recommendation === 'WATCH' && '👁 WATCH'}
                    </span>

                    {/* Win Rate */}
                    <span className="text-sm text-gray-400">
                      {alert.winRate}% historical win rate
                    </span>

                    {/* Current Price */}
                    <span className="text-sm font-mono text-gray-300">
                      ₹{alert.price.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-3 ml-4">
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button onClick={() => {
                    fetch('http://localhost:8000/api/send-test-alert', {
                      method:'POST', headers:{'Content-Type':'application/json'},
                      body: JSON.stringify({
                        email: JSON.parse(localStorage.getItem('user')||'{}').email,
                        alert: {symbol: alert.symbol, pattern: alert.alertType, win_rate: alert.winRate, occurrences: 12, conviction_score: 75, price: alert.price, key_level: Math.round(alert.price*0.97)}
                      })
                    }).then(()=>alert('Alert email sent!'));
                  }}
                  className="bg-[#1a1a2e] hover:bg-[#2a2a3e] border border-[#2a2a3e] px-3 py-1.5 text-xs rounded-lg transition-colors text-gray-300 flex items-center gap-2">
                    📧 Test Email
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>



        {/* WhatsApp Preview */}
        <div className="bg-[#12121F] rounded-xl p-6 border border-[#2a2a2a]">
          <h3 className="text-xl font-semibold mb-4">WhatsApp Alert Preview</h3>
          <div className="bg-[#075E54] max-w-sm mx-auto rounded-xl p-2 shadow-2xl">
            <div className="flex items-center p-2">
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#00D4AA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: '700', color: '#060611' }}>
                ML
              </div>
              <div className="ml-3">
                <h3 className="text-white font-semibold">📊 MarketLens AI Alert</h3>
                <p className="text-xs text-gray-300">online</p>
              </div>
            </div>
            <div className="bg-[#DCF8C6] text-black p-3 rounded-lg m-3 ml-12 relative shadow">
              <p className="text-sm">
                🚨 <strong>Alert Triggered!</strong><br />
                <strong>{alerts[0]?.symbol || 'RELIANCE'}</strong> — {alerts[0]?.condition || 'RSI Divergence'} Detected 📊<br />
                Price: ₹{alerts[0]?.price ? alerts[0].price.toFixed(0) : '2,450'} | RSI: {alerts[0]?.winRate ? (100 - alerts[0].winRate).toFixed(1) : '34.2'}<br />
                Historical Win Rate: <strong>{alerts[0]?.winRate || 67}%</strong> ({alerts[0]?.occurrences || 12} occurrences)<br />
                Recommendation: <strong>{alerts[0]?.recommendation === 'BUY' ? 'BUY NOW' : alerts[0]?.recommendation === 'WATCH' ? 'WATCH FOR ENTRY' : 'HOLD POSITION'}</strong> {alerts[0]?.recommendation === 'BUY' ? 'above' : 'at'} ₹{alerts[0]?.price ? (alerts[0].price * 1.01).toFixed(0) : '2,480'} {alerts[0]?.recommendation === 'BUY' ? 'resistance' : 'support'}.<br />
                <a href="#" className="text-blue-600">View: marketlens.ai/stock/{alerts[0]?.symbol || 'RELIANCE'}</a>
              </p>
              <div className="absolute bottom-1 right-2 text-xs text-gray-500 flex items-center">
                {alerts[0]?.triggeredAt || '9:15 AM'} <CheckCheck size={16} className="ml-1 text-blue-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertsPage;
