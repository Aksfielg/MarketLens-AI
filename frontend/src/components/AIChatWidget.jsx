import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Zap } from 'lucide-react';
import { MOCK_SIGNALS } from '../data/mockSignals';

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Smart knowledge base — always works even offline
const KNOWLEDGE = {
  reliance: {price:'~₹1,350', signal:'RSI Divergence (87 conviction)', win:'67% win rate (12 occurrences)', insight:'Showing hidden strength — sellers losing momentum. Price dipped but RSI stayed high.'},
  hdfcbank: {price:'~₹1,680', signal:'Volume Breakout (79 conviction)', win:'72% win rate (15 occurrences)', insight:'Breaking above key resistance with 2.3x average volume — very strong signal.'},
  tcs: {price:'~₹3,890', signal:'MACD Crossover (72 conviction)', win:'61% win rate (9 occurrences)', insight:'MACD line crossed above signal line — bullish momentum building in IT sector.'},
  wipro: {price:'~₹191', signal:'Breakout (59 conviction)', win:'60% win rate (8 occurrences)', insight:'Breaking above resistance level with moderate conviction. Watch for volume confirmation.'},
  sbin: {price:'~₹812', signal:'MACD Crossover (76 conviction)', win:'71% win rate (14 occurrences)', insight:"Strong MACD crossover. Banking sector is leading today's market rally."},
  bhartiartl: {price:'~₹1,640', signal:'Breakout (80 conviction)', win:'74% win rate (16 occurrences)', insight:'Multi-month breakout with the strongest conviction score today. Telecom sector outperforming.'},
};

const EXPLANATIONS = {
  rsi: 'RSI (Relative Strength Index) measures momentum on a scale of 0-100. When RSI Divergence happens, the stock price makes a new low but RSI makes a higher low — it means sellers are getting tired and the stock may reverse upward soon! This pattern has historically worked on RELIANCE 67% of the time.',
  macd: 'MACD (Moving Average Convergence Divergence) tracks two moving averages. A MACD Crossover happens when the fast line crosses above the slow line — it signals momentum is turning bullish. Think of it as two runners where the faster one just overtook the slower one!',
  breakout: "A breakout happens when a stock price finally breaks above a key resistance level (a price it struggled to cross before) — especially when volume is high. It's like a dam breaking — price tends to move fast after a breakout. BHARTIARTL is showing this today with 2.3x normal volume.",
  golden: "Golden Cross happens when the 50-day average price crosses above the 200-day average. It's a long-term bullish signal used by fund managers. TATAMOTORS and MARUTI show this pattern today.",
  double: 'Double Bottom looks like the letter "W" on a chart — price drops to a support level twice but bounces both times. The second bounce with higher RSI suggests the stock is finding strong support. A classic reversal pattern.',
  conviction: "Conviction Score (0-100) is MarketLens' own rating system. It combines: pattern strength (40%), volume confirmation (30%), RSI position (20%), and trend alignment (10%). Above 70 = high quality signal. RELIANCE scores 87 today!",
  signal: "Today's top 5 signals: 1) BHARTIARTL — Breakout (80, 74% win rate), 2) RELIANCE — RSI Divergence (87, 67% win rate), 3) SBIN — MACD Crossover (76, 71% win rate), 4) HDFCBANK — Volume Breakout (79, 72% win rate), 5) ICICIBANK — MACD Crossover (74, 69% win rate).",
  nifty: "Nifty 50 tracks India's top 50 NSE companies. Today Banking (+1.2%) and Auto (+1.8%) sectors are leading. FII (foreign investors) bought ₹1,240 Cr — a positive sign. The overall market sentiment is bullish.",
  buy: "MarketLens never gives direct buy/sell advice — that's not financial advice and markets are unpredictable! But I can tell you which stocks have the strongest historical patterns. Today's highest conviction signals are BHARTIARTL (80) and RELIANCE (87). Always do your own research!",
  help: 'I can help you with: 1) Understanding today\'s signals, 2) Explaining patterns like RSI, MACD, Breakout, 3) Stock-specific data (just ask "What is RELIANCE doing?"), 4) Market overview. What would you like to know?',
};

const getSmartReply = (text) => {
  const q = text.toLowerCase();
  for (const [sym, data] of Object.entries(KNOWLEDGE)) {
    if (q.includes(sym)) {
      return `${sym.toUpperCase()} today: ${data.price} | ${data.signal} | ${data.win}\n\n${data.insight}\n\nRemember: Past performance doesn't guarantee future results. Always invest only what you can afford to lose! 📊`;
    }
  }
  if (q.includes('rsi') || q.includes('divergence')) return EXPLANATIONS.rsi;
  if (q.includes('macd') || q.includes('crossover')) return EXPLANATIONS.macd;
  if (q.includes('breakout') || q.includes('break out')) return EXPLANATIONS.breakout;
  if (q.includes('golden cross')) return EXPLANATIONS.golden;
  if (q.includes('double bottom') || q.includes('double top')) return EXPLANATIONS.double;
  if (q.includes('conviction') || q.includes('score')) return EXPLANATIONS.conviction;
  if (q.includes('signal') || q.includes('today') || q.includes('best') || q.includes('top')) return EXPLANATIONS.signal;
  if (q.includes('nifty') || q.includes('market') || q.includes('sensex')) return EXPLANATIONS.nifty;
  if (q.includes('buy') || q.includes('sell') || q.includes('invest')) return EXPLANATIONS.buy;
  if (q.includes('help') || q.includes('what can') || q.includes('hello') || q.includes('hi')) return EXPLANATIONS.help;
  return `Great question! I'm Lens, your MarketLens AI assistant. I can help you understand today's ${Object.keys(KNOWLEDGE).length} detected signals and explain stock patterns simply. Try asking: "What is RELIANCE doing?" or "Explain RSI divergence" or "What are today's best signals?" 😊`;
};

const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const conversationRef = useRef([]);

  // Build context from today's signals
  const signalContext = MOCK_SIGNALS.slice(0, 5).map(s => 
    `${s.symbol}: ${s.pattern}, Win Rate ${s.win_rate}%, Conviction ${s.conviction_score}` 
  ).join('\n');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async (text) => {
    if (!text?.trim() || loading) return;
    const userMsg = {role:'user', content:text.trim(), time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})};
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    let reply = '';

    // Try Gemini first (if key exists)
    if (GEMINI_KEY && GEMINI_KEY.length > 20 && GEMINI_KEY !== 'undefined') {
      try {
        const signalContext = "Today's signals: RELIANCE RSI Divergence 87 conviction 67% win rate, HDFCBANK Volume Breakout 79 conviction 72% win rate, TCS MACD Crossover 72 conviction 61% win rate, BHARTIARTL Breakout 80 conviction 74% win rate, SBIN MACD Crossover 76 conviction 71% win rate. Nifty up 0.82%.";
        
        const prompt = `You are Lens, MarketLens AI assistant for Indian retail investors. Be warm, friendly, brief (2-3 sentences max). Use simple language. No jargon. Context: ${signalContext}

User asked: ${text.trim()}

Reply as Lens (friendly, helpful, simple English):`;

        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
          {method:'POST', headers:{'Content-Type':'application/json'},
           body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:150,temperature:0.8}})}
        );
        if (resp.ok) {
          const data = await resp.json();
          const geminiReply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (geminiReply && geminiReply.length > 10) {
            reply = geminiReply;
          }
        }
      } catch (e) {
        console.log('Gemini unavailable, using smart fallback');
      }
    }

    // Always fallback to smart knowledge base if Gemini failed or no key
    if (!reply) {
      reply = getSmartReply(text.trim());
    }

    setMessages(prev => [...prev, {role:'ai', content:reply, time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}]);
    setLoading(false);
  };

  const userName = JSON.parse(localStorage.getItem('user') || '{}').name?.split(' ')[0] || 'there';

  const suggestions = [
    "What is RELIANCE doing?",
    "Best signals today?",
    "Explain RSI divergence",
    "Is market bullish?",
  ];

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 flex flex-col items-end">
        <div className="mb-2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity">
          Ask MarketLens AI
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#00D4AA] text-white rounded-full p-4 shadow-lg hover:bg-[#00B894] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00D4AA] transition-all transform hover:scale-110 relative"
        >
          <Zap className="h-6 w-6" />
          <div className="absolute -top-1 -right-1 bg-[#7C3AED] text-white text-xs px-2 py-0.5 rounded-full font-bold">
            AI
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 h-[500px] bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl shadow-2xl flex flex-col animate-slide-up">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#00D4AA] to-[#7C3AED] p-4 rounded-t-xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">ML</span>
            </div>
            <div>
              <h3 className="font-bold text-white">MarketLens AI</h3>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-white/80 text-xs">Online</span>
              </div>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <p className="text-white/70 text-xs mt-2">Powered by Gemini</p>
      </div>

      {/* Chat History */}
      <div className="flex-1 p-4 overflow-y-auto bg-[#0a0a0a]">
        {/* Greeting */}
        {messages.length === 0 && (
          <div className="mb-4">
            <div className="bg-[#1A1A2E] rounded-lg p-3 max-w-[80%]">
              <p className="text-white text-sm">
                Hi {userName}! 👋 I'm Lens, your MarketLens AI assistant.<br />
                I can help you understand today's {MOCK_SIGNALS.length} signals, explain patterns in simple words, or answer any market questions.<br />
                What would you like to know?
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-8 h-8 bg-[#00D4AA] rounded-full flex items-center justify-center mr-2 text-white text-xs font-bold flex-shrink-0">
                  ML
                </div>
              )}
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-[#00D4AA] text-[#0a0a0a] rounded-br-none'
                    : 'bg-[#1A1A2E] text-white rounded-bl-none'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {msg.time}
                </p>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="w-8 h-8 bg-[#00D4AA] rounded-full flex items-center justify-center mr-2 text-white text-xs font-bold flex-shrink-0">
                ML
              </div>
              <div className="bg-[#1A1A2E] text-white p-3 rounded-lg rounded-bl-none">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {messages.length === 0 && !loading && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="bg-[#1A1A2E] hover:bg-[#2a2a3e] text-gray-300 text-xs px-3 py-2 rounded-lg transition-colors text-center"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#2a2a2a] bg-[#0a0a0a]">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}>
          <div className="flex items-center bg-[#1A1A2E] rounded-lg">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about any NSE stock..."
              className="flex-1 bg-transparent p-3 text-white focus:outline-none text-sm"
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()} 
              className="p-3 text-[#00D4AA] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AIChatWidget;
