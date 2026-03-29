import React, { useState, useEffect } from 'react';
import { Star, X, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MOCK_SIGNALS } from '../data/mockSignals';

// Move addToWatchlist outside component to make it exportable
const addToWatchlist = (symbol) => {
  const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
  if (!watchlist.includes(symbol)) {
    const updated = [...watchlist, symbol];
    localStorage.setItem('watchlist', JSON.stringify(updated));
  }
};

const Watchlist = () => {
  const [watchlist, setWatchlist] = useState(
    JSON.parse(localStorage.getItem('watchlist') || '[]')
  );
  const [currentPrices, setCurrentPrices] = useState({});
  const [pricesLoading, setPricesLoading] = useState(false);

  const removeFromWatchlist = (symbol) => {
    const updated = watchlist.filter(s => s !== symbol);
    setWatchlist(updated);
    localStorage.setItem('watchlist', JSON.stringify(updated));
  };

  const navigate = useNavigate();

  // Fetch real-time prices for watchlist stocks
  const fetchRealTimePrices = async () => {
    if (watchlist.length === 0) return;
    
    setPricesLoading(true);
    const prices = {};
    
    for (const symbol of watchlist) {
      try {
        const response = await fetch(`http://localhost:8000/api/stock-price/${symbol}`);
        const data = await response.json();
        if (!data.error) {
          prices[symbol] = data.price;
        } else {
          console.log(`Error fetching price for ${symbol}: ${data.error}`);
          prices[symbol] = null; // Indicate price not available
        }
      } catch (error) {
        console.log(`Failed to fetch price for ${symbol}:`, error);
        prices[symbol] = null; // Indicate price not available
      }
    }
    
    setCurrentPrices(prices);
    setPricesLoading(false);
  };

  // Fetch prices on component mount and when watchlist changes
  useEffect(() => {
    if (watchlist.length > 0) {
      fetchRealTimePrices();
      
      // Set up periodic price refresh every 30 seconds
      const priceInterval = setInterval(fetchRealTimePrices, 30000);
      return () => clearInterval(priceInterval);
    }
  }, [watchlist.length]);

  // Get watchlist data with real-time prices
  const watchlistData = watchlist.map(symbol => {
    const price = currentPrices[symbol];
    const signal = MOCK_SIGNALS.find(s => s.symbol === symbol);
    const change = signal && price ? ((price - signal.price) / signal.price * 100) : 0;
    
    return {
      symbol,
      price,
      change,
      hasSignal: !!signal,
      signal,
      priceAvailable: price !== null && price !== undefined
    };
  });

  if (watchlist.length === 0) {
    return (
      <div className="bg-[#12121F] rounded-xl p-6 border border-[#2a2a2a]">
        <div className="flex items-center gap-3 mb-4">
          <Star className="text-[#F59E0B]" size={20} />
          <h3 className="text-lg font-semibold">My Watchlist</h3>
        </div>
        <div className="text-center py-8">
          <Star className="mx-auto text-gray-400 mb-3" size={32} />
          <p className="text-gray-400 text-sm">
            Add stocks from signals to track them here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#12121F] rounded-xl p-6 border border-[#2a2a2a]">
      <div className="flex items-center gap-3 mb-4">
        <Star className="text-[#F59E0B]" size={20} />
        <h3 className="text-lg font-semibold">My Watchlist</h3>
        <span className="text-xs text-gray-400">({watchlist.length} stocks)</span>
        {watchlist.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <div className={`w-2 h-2 rounded-full ${pricesLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
            <span className="text-xs text-gray-400">
              {pricesLoading ? 'Updating...' : 'Live'}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {watchlistData.map((stock) => (
          <div key={stock.symbol} className="flex items-center justify-between p-3 bg-[#1a1a2e] rounded-lg border border-[#2a2a3e]">
            <div className="flex items-center gap-3">
              {stock.hasSignal && (
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              )}
              <div>
                <div className="font-semibold text-white">{stock.symbol}</div>
                <div className="text-sm text-gray-400">
                  {stock.priceAvailable ? (
                    `₹${stock.price.toFixed(2)}`
                  ) : pricesLoading ? (
                    'Loading...'
                  ) : (
                    'Price N/A'
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {stock.priceAvailable && stock.change !== 0 && (
                <div className={`flex items-center gap-1 text-sm ${
                  stock.change > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stock.change > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {stock.change > 0 ? '+' : ''}{stock.change.toFixed(1)}%
                </div>
              )}

              {stock.priceAvailable && stock.change === 0 && (
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <span>0%</span>
                </div>
              )}

              {stock.hasSignal ? (
                <button
                  onClick={() => navigate(`/stock/${stock.symbol}`)}
                  className="text-xs bg-[#00D4AA] hover:bg-[#00B894] text-white px-2 py-1 rounded transition-colors"
                >
                  View Signal
                </button>
              ) : (
                <button
                  onClick={() => removeFromWatchlist(stock.symbol)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Export the addToWatchlist function for use in other components
export { Watchlist, addToWatchlist };
export default Watchlist;
