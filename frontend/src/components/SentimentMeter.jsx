import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const SentimentMeter = ({ signals }) => {
  const bullishCount = signals.filter(s => s.signal_type === 'bullish').length;
  const sentimentScore = Math.round((bullishCount / signals.length) * 100);
  const mood = sentimentScore > 65 ? 'Greedy' : sentimentScore > 45 ? 'Neutral' : 'Fearful';

  return (
    <div className="bg-[#12121F] rounded-xl p-6 border border-[#2a2a2a]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Market Mood</h3>
        <div className="flex items-center gap-2">
          {sentimentScore > 65 ? (
            <TrendingUp size={16} className="text-green-400" />
          ) : sentimentScore > 45 ? (
            <Minus size={16} className="text-amber-400" />
          ) : (
            <TrendingDown size={16} className="text-red-400" />
          )}
          <span className="text-sm text-gray-400">
            {bullishCount} of {signals.length} signals bullish
          </span>
        </div>
      </div>

      {/* Gauge — proper arc with working needle */}
      <div className="flex flex-col items-center">
        <div className="relative">
          {(() => {
            const score = sentimentScore;
            const angle = (score / 100) * 180 - 90; // -90° (Fear) to +90° (Greed)
            const rad = (angle * Math.PI) / 180;
            const nx = 100 + 65 * Math.sin(rad);
            const ny = 100 - 65 * Math.cos(rad);
            const arcColor = score > 65 ? '#00D4AA' : score > 45 ? '#F59E0B' : '#FF4560';
            return (
              <svg width="200" height="120" viewBox="0 0 200 120">
                {/* Gray arc background */}
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round"/>
                {/* Colored arc fill */}
                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none"
                  stroke={arcColor}
                  strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * 251} 251`}/>
                {/* Zone labels */}
                <text x="20"  y="115" fontSize="10" fill="#FF4560" fontFamily="monospace" textAnchor="middle">Fear</text>
                <text x="100" y="12"  fontSize="10" fill="#F59E0B" fontFamily="monospace" textAnchor="middle">Neutral</text>
                <text x="180" y="115" fontSize="10" fill="#00D4AA" fontFamily="monospace" textAnchor="middle">Greed</text>
                {/* Needle */}
                <line x1="100" y1="100" x2={nx} y2={ny} stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="100" cy="100" r="5" fill="white"/>
              </svg>
            );
          })()}
        </div>

        {/* Mood Label */}
        <div className="text-center" style={{marginTop:'8px'}}>
          <div
            className="font-bold transition-colors duration-500"
            style={{ color: sentimentScore > 65 ? '#00D4AA' : sentimentScore > 45 ? '#F59E0B' : '#FF4560', fontSize:'16px', fontWeight:'700' }}
          >
            Market is {mood}
          </div>
          <div className="text-sm text-gray-400" style={{fontSize:'12px'}}>
            Sentiment Score: {sentimentScore}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentimentMeter;
