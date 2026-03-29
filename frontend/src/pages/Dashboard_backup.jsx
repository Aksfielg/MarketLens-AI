import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Zap, Loader2 } from 'lucide-react';

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

function SignalSkeletonCard() {
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 animate-pulse">
      <div className="h-5 w-20 rounded bg-[#2a2a2a]" />
      <div className="mt-3 h-5 w-32 rounded bg-[#2a2a2a]" />
      <div className="mt-3 h-4 w-24 rounded bg-[#2a2a2a]" />
      <div className="mt-4 h-4 w-36 rounded bg-[#2a2a2a]" />
      <div className="mt-3 h-4 w-full rounded bg-[#2a2a2a]" />
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());

  // Mock data for testing
  const mockSignals = [
    {
      symbol: 'RELIANCE',
      pattern_type: 'RSI Divergence',
      key_price: 2850.50,
      conviction_score: 85,
      description: 'Bullish RSI divergence detected on daily chart with increasing volume.'
    },
    {
      symbol: 'TCS',
      pattern_type: 'MACD Crossover',
      key_price: 3650.75,
      conviction_score: 72,
      description: 'MACD line crossing above signal line indicating upward momentum.'
    },
    {
      symbol: 'HDFCBANK',
      pattern_type: 'Volume Breakout',
      key_price: 1585.25,
      conviction_score: 68,
      description: 'High volume breakout above resistance level with strong buying pressure.'
    }
  ];

  useEffect(() => {
    // Simulate API call with mock data
    setTimeout(() => {
      setSignals(mockSignals);
      setLoading(false);
      setLastUpdated(new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }));
    }, 1000);

    // Update market status every minute
    const statusTimer = setInterval(() => setMarketStatus(getMarketStatus()), 60 * 1000);

    return () => {
      clearInterval(statusTimer);
    };
  }, []);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-center p-2 text-sm font-medium text-white">
        This is a demo environment. Data may be delayed or simulated.
      </div>
      <header className="border-b border-[#2a2a2a] px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MarketLens AI</h1>
            <p className="mt-1 text-sm text-gray-400">{today}</p>
          </div>
          <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${marketStatus.color.replace('text-', 'bg-').replace('-400', '-900').replace('-500', '-800')} ${marketStatus.color}`}>
            <Clock size={14} />
            <span>{marketStatus.message}</span>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-300">Scanning 200 NSE stocks</p>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6 rounded-xl bg-gradient-to-r from-[#1e1e1e] to-[#1a1a1a] p-6 border border-[#2a2a2a] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">AI-Generated Daily Briefing</h2>
            <p className="text-gray-400 mt-1">Get today's market summary in a 60-second video.</p>
          </div>
          <button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-300 flex items-center gap-2">
            <span>Generate Today's Market Video ▶</span>
          </button>
        </div>

        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Zap size={20} className="text-yellow-400" />
            Top Signals Feed
          </h2>
          {lastUpdated ? <span className="text-xs text-gray-500">Updated: {lastUpdated}</span> : null}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-900 bg-[#1a1a1a] p-4 text-sm text-red-300">{error}</div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, idx) => <SignalSkeletonCard key={idx} />)
            : signals.map((signal) => (
                <button
                  key={`${signal.symbol}-${signal.pattern_type}`}
                  type="button"
                  onClick={() =>
                    navigate(`/stock/${signal.symbol}`, {
                      state: { signal },
                    })
                  }
                  className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 text-left transition hover:border-gray-500"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xl font-semibold">{signal.symbol}</h3>
                    <span className={`rounded px-2 py-1 text-xs font-medium ${getConvictionBadge(Number(signal.conviction_score || 0))}`}>
                      Conviction {Math.round(Number(signal.conviction_score || 0))}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-300">{signal.pattern_type}</p>
                  <p className="mt-2 text-sm text-gray-400">
                    Current Price: ₹{Number(signal.key_price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                  <p className="mt-3 truncate text-sm text-gray-400">
                    {signal.description || `Pattern ${signal.pattern_type} detected near key level.`}
                  </p>
                </button>
              ))}
        </div>
      </main>
    </div>
  );
}
