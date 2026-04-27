import { useState, useEffect, useRef } from 'react';
import { Film, Camera, Download, Share2, ChevronDown, Loader2, CheckCircle, XCircle, Play, Pause, RotateCcw, Clock, TrendingUp, Trash2, Brain, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_SIGNALS } from '../data/mockSignals';

const VideoStudio = () => {
  // Audio state
  const audioRef = useRef(null);
  const [sceneAudios, setSceneAudios] = useState([]); // array of blob URLs
  const [audioReady, setAudioReady] = useState(false);
  const [audioStatus, setAudioStatus] = useState(''); // 'loading' | 'ready' | 'error'
  const [userInteracted, setUserInteracted] = useState(false);

  // Video state
  const [videoType, setVideoType] = useState('Top Signals');
  const [videoLength, setVideoLength] = useState(60);
  const [narrationVoice, setNarrationVoice] = useState('Neutral English');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [videoReady, setVideoReady] = useState(false);
  const [generatedScript, setGeneratedScript] = useState([]);
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [pastVideos, setPastVideos] = useState(() => 
    JSON.parse(localStorage.getItem('pastVideos') || '[]')
  );
  const [isScriptVisible, setIsScriptVisible] = useState(false);
  const [currentSignals, setCurrentSignals] = useState([]);
  const [marketData, setMarketData] = useState({ nifty: { change: '+0.82%', value: '22,526' }, totalSignals: 0 });

  // D-ID Avatar state
  const [avatarVideoUrl, setAvatarVideoUrl] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Fetch real-time signals and market data
  useEffect(() => {
    const fetchRealData = async () => {
      try {
        // Fetch current signals
        const signalsResponse = await fetch('http://localhost:8000/api/signals');
        if (signalsResponse.ok) {
          const signalsData = await signalsResponse.json();
          setCurrentSignals(signalsData.length > 0 ? signalsData : MOCK_SIGNALS);
          setMarketData(prev => ({ ...prev, totalSignals: signalsData.length }));
        } else {
          setCurrentSignals(MOCK_SIGNALS);
          setMarketData(prev => ({ ...prev, totalSignals: MOCK_SIGNALS.length }));
        }

        // Fetch market indices
        const indicesResponse = await fetch('http://localhost:8000/api/market-indices');
        if (indicesResponse.ok) {
          const indicesData = await indicesResponse.json();
          if (indicesData.nifty) {
            setMarketData(prev => ({
              ...prev,
              nifty: {
                change: indicesData.nifty.change || '+0.82%',
                value: indicesData.nifty.price || '22,526'
              }
            }));
          }
        }
      } catch (error) {
        console.log('Failed to fetch real data, using demo data');
        setCurrentSignals(MOCK_SIGNALS);
        setMarketData({ nifty: { change: '+0.82%', value: '22,526' }, totalSignals: MOCK_SIGNALS.length });
      }
    };

    fetchRealData();
  }, []);

  // Play current audio
  const playCurrentAudio = () => {
    if (sceneAudios[currentScene] && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = sceneAudios[currentScene];
      audioRef.current.load();
      audioRef.current.play().then(() => {
        console.log('Audio playing for scene', currentScene);
      }).catch(err => {
        console.error('Audio play failed:', err);
      });
    }
  };

  // Auto-play audio when scene changes (if user interacted)
  useEffect(() => {
    if (videoReady && userInteracted && sceneAudios[currentScene]) {
      playCurrentAudio();
    }
  }, [currentScene, videoReady]);

  // Generate audio for all scenes
  const generateAudioForScenes = async (script) => {
    setAudioStatus('loading');
    const audioUrls = [];
    
    for (let i = 0; i < script.length; i++) {
      try {
        const res = await fetch('http://localhost:8000/api/generate-narration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: script[i].narration })
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        
        if (data.audio_base64) {
          // Convert base64 to blob URL correctly:
          const binaryStr = atob(data.audio_base64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let j = 0; j < binaryStr.length; j++) {
            bytes[j] = binaryStr.charCodeAt(j);
          }
          const blob = new Blob([bytes], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          audioUrls.push(url);
          console.log(`Audio ready for scene ${i+1}`);
        } else {
          console.log(`No audio for scene ${i+1}, using silence`);
          audioUrls.push(null);
        }
      } catch (err) {
        console.error(`Audio error scene ${i+1}:`, err.message);
        audioUrls.push(null);
      }
    }
    
    setSceneAudios(audioUrls);
    setAudioReady(audioUrls.some(u => u !== null));
    setAudioStatus(audioUrls.some(u => u !== null) ? 'ready' : 'error');
    return audioUrls;
  };

  // Delete video function
  const deleteVideo = (id) => {
    const updated = pastVideos.filter(v => v.id !== id);
    setPastVideos(updated);
    localStorage.setItem('pastVideos', JSON.stringify(updated));
  };

  // Download script
  const downloadScript = (video) => {
    const scriptText = video.script ? 
      video.script.map((s, i) => `Scene ${i+1} (${s.duration}s): ${s.title}\n${s.narration}`).join('\n\n') :
      'Script not available';
    
    const blob = new Blob([
      `MarketLens AI — Video Script\n${'='.repeat(40)}\n${video.title}\n${video.date}\n\n${scriptText}\n\nGenerated by MarketLens AI` 
    ], { type: 'text/plain' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketlens-script-${video.date.replace(/\//g,'-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Auto-advance scenes and play audio
  useEffect(() => {
    if (!videoReady || generatedScript.length === 0 || isPaused) return;
    
    const timer = setTimeout(() => {
      setCurrentScene(prev => (prev + 1) % generatedScript.length);
    }, 5000);  // 5 seconds per scene
    return () => clearTimeout(timer);
  }, [videoReady, currentScene, isPaused, generatedScript]);

  // Generate Avatar Video (fully local — no D-ID)
  const generateAvatarVideo = async () => {
    setAvatarLoading(true);
    
    const fullScript = generatedScript
      .map(s => s.narration)
      .join('. ')
      .slice(0, 500);
    
    try {
      const res = await fetch('http://localhost:8000/api/generate-avatar-video', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
          script_text: fullScript,
          signals: currentSignals.slice(0, 4).map(s => ({
            symbol: s.symbol,
            conviction_score: s.conviction_score,
            pattern: s.pattern,
            win_rate: s.win_rate
          }))
        })
      });
      
      const data = await res.json();
      if (data.video_base64) {
        // Convert base64 to blob URL for in-browser playback
        const bytes = Uint8Array.from(atob(data.video_base64), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: 'video/mp4' });
        const blobUrl = URL.createObjectURL(blob);
        setAvatarVideoUrl(blobUrl);
      } else if (data.video_url) {
        setAvatarVideoUrl(data.video_url);
      } else {
        alert('Avatar video failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Failed to connect to backend: ' + err.message);
    }
    setAvatarLoading(false);
  };

  const handleGenerateVideo = async () => {
    setGenerating(true);
    setProgress(0);
    setStatusMsg('Writing AI script...');
    setVideoReady(false);
    
    let script = [];
    
    // Step 1: Get script from backend using real data
    try {
      const res = await fetch('http://localhost:8000/api/generate-video-script', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({signals: currentSignals.slice(0,3), type: videoType, marketData})
      });
      const data = await res.json();
      if (data.script) script = data.script;
    } catch {
      // Fallback script using real data
      script = [
        {scene:1,title:'Market Overview',duration:12,narration:`Good morning! Nifty ${marketData.nifty.change} today. Our AI found ${marketData.totalSignals} signals across 200 NSE stocks.`},
        {scene:2,title:'Top Signal',duration:16,narration:`${currentSignals[0]?.symbol || 'RELIANCE'} shows ${currentSignals[0]?.pattern || 'RSI Divergence'} with ${currentSignals[0]?.conviction_score || 87} conviction score. Historically this pattern has a ${currentSignals[0]?.win_rate || 67}% win rate.`},
        {scene:3,title:'Second Signal',duration:16,narration:`${currentSignals[1]?.symbol || 'HDFCBANK'} ${currentSignals[1]?.pattern || 'Volume Breakout'} detected. ${currentSignals[1]?.win_rate || 72}% historical win rate with ${currentSignals[1]?.conviction_score || 79} conviction.`},
        {scene:4,title:'Summary',duration:16,narration:'These are AI-detected patterns from real market data. Always research before investing. Visit MarketLens AI for full analysis.'},
      ];
    }
    
    setProgress(30);
    setStatusMsg('Generating voice narration...');
    setGeneratedScript(script);
    
    // Step 2: Generate audio for each scene
    await generateAudioForScenes(script);
    
    setProgress(95);
    setStatusMsg('Video ready!');
    await new Promise(r => setTimeout(r,500));
    setProgress(100);
    setVideoReady(true);
    setCurrentScene(0);
    setGenerating(false);
    
    // Save to history with real data
    const video = {
      id:Date.now(), 
      title:`Market Update — ${new Date().toLocaleDateString('en-IN')}`, 
      duration:'60 sec', 
      date:new Date().toLocaleDateString('en-IN'), 
      script,
      signalsUsed: currentSignals.slice(0,3).map(s => s.symbol),
      marketData
    };
    const past = JSON.parse(localStorage.getItem('pastVideos')||'[]');
    const updated = [video,...past.slice(0,4)];
    localStorage.setItem('pastVideos', JSON.stringify(updated));
    setPastVideos(updated);
  };

  const handleDownload = () => {
    const scriptText = generatedScript.map(scene => 
      `Scene ${scene.scene}: ${scene.title}\nDuration: ${scene.duration}s\nNarration: ${scene.narration}\n`
    ).join('\n');
    
    const blob = new Blob([scriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `market-update-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    const shareText = `Check out today's market update video from MarketLens AI! Top signals: ${generatedScript.map(s => s.title).join(', ')}`;
    if (navigator.share) {
      navigator.share({ text: shareText });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Link copied to clipboard!');
    }
  };

  const regenerateVideo = () => {
    setVideoReady(false);
    setCurrentScene(0);
    handleGenerateVideo();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-center p-2 text-sm font-medium text-white">
        AI Video Studio — Generate Market Updates in Seconds
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-[#00D4AA] to-[#7C3AED] bg-clip-text text-transparent">
            AI Video Studio
          </h1>
          <p className="text-gray-400 text-lg">
            Transform market data into professional video updates with AI
          </p>
        </div>

        {/* Controls */}
        <div className="bg-[#12121F] rounded-xl p-6 border border-[#2a2a2a] mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Video Type</label>
              <select 
                value={videoType} 
                onChange={(e) => setVideoType(e.target.value)}
                className="w-full bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-4 py-2 text-white"
              >
                <option>Top Signals</option>
                <option>Market Overview</option>
                <option>Sector Focus</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Duration</label>
              <select 
                value={videoLength} 
                onChange={(e) => setVideoLength(Number(e.target.value))}
                className="w-full bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-4 py-2 text-white"
              >
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
                <option value={90}>90 seconds</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Voice Style</label>
              <select 
                value={narrationVoice} 
                onChange={(e) => setNarrationVoice(e.target.value)}
                className="w-full bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-4 py-2 text-white"
              >
                <option>Neutral English</option>
                <option>Professional</option>
                <option>Energetic</option>
              </select>
            </div>
          </div>

          {!videoReady && (
            <button
              onClick={handleGenerateVideo}
              disabled={generating}
              className="w-full bg-gradient-to-r from-[#00D4AA] to-[#7C3AED] hover:from-[#00B894] hover:to-[#6B2FCD] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3"
            >
              {generating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Generating Video...
                </>
              ) : (
                <>
                  <Film size={20} />
                  Generate Market Video
                </>
              )}
            </button>
          )}

          {/* Progress Bar */}
          {generating && (
            <div className="mt-6">
              <div className="w-full h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#00D4AA] to-[#7C3AED] rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 mt-2 text-center">{statusMsg}</p>
            </div>
          )}
        </div>

        {/* Video Preview */}
        <div className="space-y-6">
          {/* Video Player */}
            <div className="bg-[#12121F] rounded-xl p-6 border border-[#2a2a2a]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Video Preview</h3>
                {videoReady && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-lg transition-colors"
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button
                      onClick={regenerateVideo}
                      className="p-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-lg transition-colors"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Hidden audio element for narration */}
              <audio ref={audioRef} style={{display:'none'}}
                onEnded={() => {
                  // Auto-advance to next scene when audio finishes
                  setCurrentScene(prev => (prev + 1) % generatedScript.length);
                }}
              />

              {/* Video Preview Container */}
              <div style={{
                width:'100%', aspectRatio:'16/9', borderRadius:'12px', overflow:'hidden',
                background:'#020210', position:'relative',
                border: videoReady ? '1px solid rgba(0,212,170,0.3)' : '1px solid rgba(255,255,255,0.06)'
              }}>

                {/* State: Not generated yet */}
                {!videoReady && !generating && (
                  <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'12px'}}>
                    <div style={{fontSize:'40px'}}>🎬</div>
                    <div style={{color:'#8B8BA8',fontSize:'14px'}}>Click "Generate Market Video" to start</div>
                  </div>
                )}

                {/* State: Generating */}
                {generating && (
                  <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px'}}>
                    <div style={{display:'flex',gap:'6px'}}>
                      {[0,1,2,3].map(i => <div key={i} style={{width:'8px',height:'8px',borderRadius:'50%',background:'#00D4AA',animation:`bounce 1s infinite ${i*0.15}s`}}/>)}
                    </div>
                    <div style={{color:'#00D4AA',fontSize:'14px',fontWeight:'500'}}>{statusMsg}</div>
                    <div style={{width:'60%',height:'4px',background:'rgba(255,255,255,0.1)',borderRadius:'2px',overflow:'hidden'}}>
                      <div style={{width:`${progress}%`,height:'100%',background:'linear-gradient(90deg,#00D4AA,#7C3AED)',borderRadius:'2px',transition:'width 0.5s ease'}}/>
                    </div>
                    <div style={{color:'#8B8BA8',fontSize:'12px'}}>{progress}%</div>
                  </div>
                )}

                {/* State: Video Ready — Animated Scene Player */}
                {videoReady && generatedScript.length > 0 && (
                  <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px',background:'linear-gradient(135deg,#060611 0%,#0D0D1A 50%,#060611 100%)'}}>
                    
                    {/* MarketLens watermark */}
                    <div style={{position:'absolute',top:'12px',right:'16px',color:'#00D4AA',fontSize:'11px',fontWeight:'700',letterSpacing:'1px'}}>MarketLens AI</div>
                    
                    {/* Scene dots */}
                    <div style={{position:'absolute',top:'12px',left:'16px',display:'flex',gap:'5px'}}>
                      {generatedScript.map((_,i) => (
                        <div key={i} style={{width:'7px',height:'7px',borderRadius:'50%',background:i===currentScene?'#00D4AA':'rgba(255,255,255,0.2)',transition:'background 0.3s'}}/>
                      ))}
                    </div>
                    
                    {/* Scene label */}
                    <div style={{color:'#00D4AA',fontSize:'10px',fontWeight:'700',letterSpacing:'2px',textTransform:'uppercase',marginBottom:'12px'}}>
                      {generatedScript[currentScene]?.title || 'Market Update'}
                    </div>
                    
                    {/* Main display — changes per scene */}
                    {currentScene === 0 && (
                      <div style={{textAlign:'center'}}>
                        <div style={{color:'white',fontSize:'28px',fontWeight:'700',fontFamily:'monospace',marginBottom:'8px'}}>NIFTY 50</div>
                        <div style={{color:'#00D4AA',fontSize:'40px',fontWeight:'700',fontFamily:'monospace'}}>{marketData.nifty.change}</div>
                        <div style={{color:'#8B8BA8',fontSize:'13px',marginTop:'8px'}}>{marketData.nifty.value} points • {marketData.totalSignals} signals found</div>
                      </div>
                    )}
                    {currentScene === 1 && (
                      <div style={{textAlign:'center'}}>
                        <div style={{color:'#8B8BA8',fontSize:'13px',marginBottom:'6px'}}>Top Signal Today</div>
                        <div style={{color:'white',fontSize:'32px',fontWeight:'700',fontFamily:'Space Grotesk,sans-serif'}}>{currentSignals[0]?.symbol || 'RELIANCE'}</div>
                        <div style={{color:'#00D4AA',fontSize:'16px',fontWeight:'600',marginTop:'4px'}}>{currentSignals[0]?.pattern || 'RSI Divergence'}</div>
                        <div style={{display:'flex',gap:'24px',marginTop:'16px',justifyContent:'center'}}>
                          <div style={{textAlign:'center'}}><div style={{color:'#00D4AA',fontSize:'28px',fontWeight:'700',fontFamily:'monospace'}}>{currentSignals[0]?.conviction_score || 87}</div><div style={{color:'#8B8BA8',fontSize:'11px'}}>Conviction</div></div>
                          <div style={{textAlign:'center'}}><div style={{color:'#00D4AA',fontSize:'28px',fontWeight:'700',fontFamily:'monospace'}}>{currentSignals[0]?.win_rate || 67}%</div><div style={{color:'#8B8BA8',fontSize:'11px'}}>Win Rate</div></div>
                        </div>
                      </div>
                    )}
                    {currentScene === 2 && (
                      <div style={{textAlign:'center'}}>
                        <div style={{color:'#8B8BA8',fontSize:'13px',marginBottom:'6px'}}>Signal #2</div>
                        <div style={{color:'white',fontSize:'32px',fontWeight:'700'}}>{currentSignals[1]?.symbol || 'HDFCBANK'}</div>
                        <div style={{color:'#00D4AA',fontSize:'16px',marginTop:'4px'}}>{currentSignals[1]?.pattern || 'Volume Breakout'}</div>
                        <div style={{display:'flex',gap:'24px',marginTop:'16px',justifyContent:'center'}}>
                          <div style={{textAlign:'center'}}><div style={{color:'#00D4AA',fontSize:'28px',fontWeight:'700',fontFamily:'monospace'}}>{currentSignals[1]?.conviction_score || 79}</div><div style={{color:'#8B8BA8',fontSize:'11px'}}>Conviction</div></div>
                          <div style={{textAlign:'center'}}><div style={{color:'#00D4AA',fontSize:'28px',fontWeight:'700',fontFamily:'monospace'}}>{currentSignals[1]?.win_rate || 72}%</div><div style={{color:'#8B8BA8',fontSize:'11px'}}>Win Rate</div></div>
                        </div>
                      </div>
                    )}
                    {currentScene === 3 && (
                      <div style={{textAlign:'center'}}>
                        <div style={{color:'white',fontSize:'20px',fontWeight:'600',marginBottom:'16px'}}>Today's Summary</div>
                        <div style={{display:'flex',gap:'20px',justifyContent:'center'}}>
                          {(currentSignals.slice(0,3) || ['RELIANCE','HDFCBANK','BHARTIARTL']).map((s,i) => {
                            const signal = typeof s === 'string' ? currentSignals.find(sig => sig.symbol === s) : s;
                            return (
                              <div key={signal?.symbol || s} style={{textAlign:'center',padding:'10px 14px',background:'rgba(0,212,170,0.1)',borderRadius:'8px',border:'1px solid rgba(0,212,170,0.2)'}}>
                                <div style={{color:'white',fontWeight:'600',fontSize:'12px'}}>{signal?.symbol || s}</div>
                                <div style={{color:'#00D4AA',fontSize:'14px',fontWeight:'700',marginTop:'4px'}}>{signal?.conviction_score || [87,79,80][i]}</div>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{color:'#8B8BA8',fontSize:'11px',marginTop:'16px'}}>Not financial advice • Visit marketlens.ai</div>
                      </div>
                    )}
                    
                    {/* Narration subtitle bar */}
                    <div style={{
                      position:'absolute',bottom:'0',left:'0',right:'0',
                      background:'rgba(0,0,0,0.85)',padding:'10px 16px',
                      fontSize:'12px',color:'white',textAlign:'center',lineHeight:'1.4',
                      borderTop:'1px solid rgba(255,255,255,0.06)'
                    }}>
                      {generatedScript[currentScene]?.narration || ''}
                    </div>

                    {/* Play/Pause control */}
                    <div style={{position:'absolute',bottom:'48px',right:'12px',display:'flex',gap:'6px'}}>
                      <button onClick={() => setIsPaused(!isPaused)}
                        style={{background:'rgba(255,255,255,0.1)',border:'none',borderRadius:'6px',padding:'4px 8px',color:'white',fontSize:'12px',cursor:'pointer'}}>
                        {isPaused ? '▶' : '⏸'}
                      </button>
                      <button onClick={() => setCurrentScene(0)}
                        style={{background:'rgba(255,255,255,0.1)',border:'none',borderRadius:'6px',padding:'4px 8px',color:'white',fontSize:'12px',cursor:'pointer'}}>
                        ↺
                      </button>
                    </div>
                  </div>
                )}

                {/* Play with Voice Button */}
                {videoReady && (
                  <button
                    onClick={() => {
                      setUserInteracted(true);
                      playCurrentAudio();
                    }}
                    style={{
                      position:'absolute', bottom:'52px', left:'50%', transform:'translateX(-50%)',
                      background: audioReady ? 'rgba(0,212,170,0.2)' : 'rgba(255,255,255,0.1)',
                      border: `1px solid ${audioReady ? '#00D4AA' : 'rgba(255,255,255,0.2)'}`,
                      borderRadius:'20px', padding:'6px 16px', color:'white', cursor:'pointer',
                      fontSize:'12px', display:'flex', alignItems:'center', gap:'6px',
                      transition:'all 0.2s'
                    }}
                  >
                    {audioStatus === 'loading' ? (
                      <>
                        <div style={{width:'8px',height:'8px',borderRadius:'50%',border:'1.5px solid #00D4AA',borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/>
                        Generating voice...
                      </>
                    ) : audioReady ? (
                      <>🔊 Play with AI Voice</>
                    ) : (
                      <>🔇 Voice unavailable</>
                    )}
                  </button>
                )}
              </div>

              {/* Video Actions */}
              {videoReady && (
                <div className="flex justify-center gap-4 mt-6">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-lg transition-colors"
                  >
                    <Download size={16} />
                    Download Script
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-lg transition-colors"
                  >
                    <Share2 size={16} />
                    Share
                  </button>
                  <button
                    onClick={() => setIsScriptVisible(!isScriptVisible)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-lg transition-colors"
                  >
                    <Film size={16} />
                    {isScriptVisible ? 'Hide' : 'Show'} Script
                  </button>
                </div>
              )}

              {/* D-ID Avatar Video Section */}
              {videoReady && (
                <div style={{marginTop:'16px', padding:'16px', background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:'10px'}}>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px'}}>
                    <div>
                      <div style={{color:'white', fontWeight:'600', fontSize:'14px'}}>🧑‍💼 AI Presenter Video</div>
                      <div style={{color:'#8B8BA8', fontSize:'12px'}}>Generate a talking avatar video (uses D-ID API)</div>
                    </div>
                    <button
                      onClick={generateAvatarVideo}
                      disabled={avatarLoading}
                      style={{background:'rgba(124,58,237,0.2)',border:'1px solid #7C3AED',borderRadius:'8px',padding:'8px 16px',color:'#A78BFA',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>
                      {avatarLoading ? 'Generating... ~30s' : '🎥 Generate with Avatar'}
                    </button>
                  </div>
                  
                  {avatarVideoUrl && (
                    <div>
                      <video src={avatarVideoUrl} controls style={{width:'100%',borderRadius:'8px',maxHeight:'300px'}}/>
                      <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
                        <a href={avatarVideoUrl} download="marketlens-avatar-video.mp4"
                          style={{flex:1,background:'rgba(0,212,170,0.1)',border:'1px solid #00D4AA',borderRadius:'8px',padding:'8px',color:'#00D4AA',textDecoration:'none',textAlign:'center',fontSize:'12px'}}>
                          ⬇ Download MP4
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {!avatarVideoUrl && !avatarLoading && (
                    <div style={{color:'#8B8BA8',fontSize:'12px',textAlign:'center',padding:'12px'}}>
                      Click above to generate a 30-second video with an AI presenter explaining today's signals
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Script Preview */}
            {videoReady && isScriptVisible && (
              <div className="bg-[#12121F] rounded-xl p-6 border border-[#2a2a2a]">
                <h3 className="text-xl font-semibold mb-4">Generated Script</h3>
                <div className="space-y-3">
                  {generatedScript.map((scene, i) => (
                    <div key={i} style={{display:'flex', gap:'12px', padding:'12px', borderLeft:`2px solid ${i===currentScene?'#00D4AA':'#2a2a3e'}`, marginBottom:'8px', background:'#1a1a2e', borderRadius:'0 8px 8px 0'}}>
                      <span style={{color:'#00D4AA', fontFamily:'monospace', minWidth:'50px'}}>{scene.duration}s</span>
                      <div>
                        <div style={{color:'white', fontWeight:'500', fontSize:'13px', marginBottom:'3px'}}>{scene.title}</div>
                        <div style={{color:'#8B8BA8', fontSize:'12px'}}>{scene.narration}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        {/* Past Videos */}
        <div className="bg-[#12121F] rounded-xl p-6 border border-[#2a2a2a]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Recent Videos</h3>
            <span className="text-sm text-gray-400">{pastVideos.length} videos</span>
          </div>
          
          {pastVideos.length > 0 ? (
            pastVideos.map(video => (
              <div key={video.id} style={{
                background:'#1A1A2E', border:'1px solid rgba(255,255,255,0.08)',
                borderRadius:'10px', padding:'14px', marginBottom:'10px'
              }}>
                <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'10px'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <div style={{fontSize:'24px'}}>🎬</div>
                    <div>
                      <div style={{color:'white', fontWeight:'600', fontSize:'13px'}}>{video.title}</div>
                      <div style={{color:'#8B8BA8', fontSize:'11px', marginTop:'2px'}}>
                        {video.date} • {video.duration}
                        {video.script && ` • ${video.script.length} scenes`}
                      </div>
                      {video.script && (
                        <div style={{color:'#8B8BA8', fontSize:'11px', marginTop:'2px'}}>
                          Signals: {video.script.slice(1,-1).map(s=>s.title?.split(' ')[0]).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Delete button */}
                  <button onClick={() => deleteVideo(video.id)}
                    style={{background:'rgba(255,69,96,0.1)',border:'1px solid rgba(255,69,96,0.2)',borderRadius:'6px',padding:'4px 8px',color:'#FF4560',cursor:'pointer',fontSize:'12px'}}>
                    🗑 Delete
                  </button>
                </div>
                
                <div style={{display:'flex', gap:'8px'}}>
                  <button onClick={() => downloadScript(video)}
                    style={{flex:1,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'8px',color:'white',cursor:'pointer',fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                    ⬇ Download Script
                  </button>
                  <button onClick={() => {
                    const text = `📊 Today's MarketLens AI Market Update!\n\nTop signals: RELIANCE (RSI Divergence, 67% win rate), HDFCBANK (Volume Breakout, 72% win rate)\n\nNifty: -2.09% today. Visit marketlens.ai for full analysis!\n\n#NSE #MarketLens #StockSignals`;
                    navigator.clipboard.writeText(text);
                    alert('Market update copied! Paste in WhatsApp or Instagram.');
                  }}
                    style={{flex:1,background:'rgba(0,212,170,0.08)',border:'1px solid rgba(0,212,170,0.2)',borderRadius:'8px',padding:'8px',color:'#00D4AA',cursor:'pointer',fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                    📤 Share
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{textAlign:'center',color:'#8B8BA8',fontSize:'13px',padding:'24px'}}>
              No videos generated yet.<br/>
              <span style={{fontSize:'12px'}}>Click "Generate Market Video" to create your first one!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoStudio;
