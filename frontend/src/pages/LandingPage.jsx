import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ArrowRight } from 'lucide-react'; // Assuming lucide-react for icons

const StatPill = ({ children }) => (
  <div className="border border-border-subtle bg-bg-surface rounded-full px-3 py-1 text-xs text-text-secondary font-mono">
    {children}
  </div>
);

const FeatureCard = ({ icon, title, description }) => (
    <div className="card p-6">
        <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center mb-4">
            {icon}
        </div>
        <h3 className="font-display text-lg font-semibold mb-2">{title}</h3>
        <p className="text-text-secondary text-sm">{description}</p>
    </div>
);

const HowItWorksCard = ({ number, title, description }) => (
    <div className="card p-6 text-center relative">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-brand-primary/20 text-brand-primary font-mono font-bold text-sm rounded-full flex items-center justify-center border-2 border-bg-surface">
            {number}
        </div>
        <h3 className="font-display text-lg font-semibold mt-6 mb-2">{title}</h3>
        <p className="text-text-secondary text-sm">{description}</p>
    </div>
);


const useAnimatedCounter = (target, duration = 1500) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    let start = 0;
                    const end = parseInt(target.toString().replace(/,/g, ''));
                    if (start === end) return;

                    let startTime = null;
                    const step = (timestamp) => {
                        if (!startTime) startTime = timestamp;
                        const progress = Math.min((timestamp - startTime) / duration, 1);
                        setCount(Math.floor(progress * end));
                        if (progress < 1) {
                            window.requestAnimationFrame(step);
                        }
                    };
                    window.requestAnimationFrame(step);
                    observer.unobserve(ref.current);
                }
            },
            { threshold: 0.5 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, [target, duration]);

    return [ref, count];
};


const LandingPage = () => {
    const navigate = useNavigate();
    const isLoggedIn = !!localStorage.getItem('token');
    
    const [statsRef1, count1] = useAnimatedCounter(200);
    const [statsRef2, count2] = useAnimatedCounter(5);
    const [statsRef3, count3] = useAnimatedCounter(67);
    const [statsRef4, count4] = useAnimatedCounter(2);

    const sectionsRef = useRef([]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        }, { threshold: 0.1 });

        sectionsRef.current.forEach(section => {
            if (section) observer.observe(section);
        });

        return () => observer.disconnect();
    }, []);

    const addToRefs = (el) => {
        if (el && !sectionsRef.current.includes(el)) {
            sectionsRef.current.push(el);
        }
    };

  return (
    <div className="bg-bg-base text-text-primary">
      {/* Hero Section */}
      <section ref={addToRefs} className="py-20 md:py-32 text-center relative overflow-hidden fade-in-up">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
          <div 
              className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-brand-primary/5 rounded-full"
              style={{ filter: 'blur(150px)' }}
          ></div>
          
          <div className="container mx-auto px-6 relative">
              <div className="flex justify-center items-center gap-2 mb-4">
                  <StatPill>+200 Signals Daily</StatPill>
                  <StatPill>95% Coverage</StatPill>
                  <StatPill>Real-time</StatPill>
              </div>
              <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-6">
                  Unlock Market Alpha with <br/>
                  <span className="text-brand-primary">AI-Powered Intelligence</span>
              </h1>
              <p className="max-w-2xl mx-auto text-text-secondary md:text-lg mb-8">
                  Stop guessing. MarketLens AI scans the entire NSE for high-probability patterns, giving you a data-driven edge in minutes, not hours.
              </p>
              <div className="flex justify-center items-center gap-4">
                  <button onClick={() => navigate('/signup')} className="btn-primary text-base">
                      Start 7-Day Free Trial
                  </button>
                  <button onClick={() => {
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                  }} className="flex items-center gap-2 text-sm font-medium hover:text-brand-primary transition-colors">
                      <Play className="w-5 h-5 bg-brand-primary/20 text-brand-primary rounded-full p-1"/>
                      Watch Demo
                  </button>
              </div>
          </div>
      </section>

      {/* Section 2: Live Stats Bar */}
      <section ref={addToRefs} className="bg-bg-elevated py-12 scroll-animate">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
                <p ref={statsRef1} className="font-display text-4xl font-bold text-brand-primary">{count1}+</p>
                <p className="text-text-secondary">Stocks</p>
            </div>
            <div>
                <p ref={statsRef2} className="font-display text-4xl font-bold text-brand-primary">{count2}</p>
                <p className="text-text-secondary">Patterns</p>
            </div>
            <div>
                <p ref={statsRef3} className="font-display text-4xl font-bold text-brand-primary">{count3}%</p>
                <p className="text-text-secondary">Win Rate</p>
            </div>
            <div>
                <p ref={statsRef4} className="font-display text-4xl font-bold text-brand-primary">{count4}yr</p>
                <p className="text-text-secondary">History</p>
            </div>
        </div>
      </section>

      {/* Section 3: How It Works */}
      <section id="how-it-works" ref={addToRefs} className="py-20 px-6 lg:px-12 scroll-animate">
        <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">A Simple, Powerful Process</h2>
            <p className="text-text-secondary">We combine algorithmic precision with historical data to give you an edge.</p>
        </div>
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 md:gap-16">
            <HowItWorksCard number="1" title="📡 Scan" description="Every morning our engine scans all NSE stocks using real technical algorithms — not GPT guessing." />
            <HowItWorksCard number="2" title="🧠 Detect" description="Identifies breakouts, RSI divergence, MACD crossovers and 5 more proven chart patterns." />
            <HowItWorksCard number="3" title="📊 Backtest" description="Shows you the exact historical win rate for that pattern on that specific stock. No other tool does this." />
        </div>
      </section>

      {/* Section 4: Features Grid */}
      <section id="features" ref={addToRefs} className="py-20 px-6 lg:px-12 bg-bg-surface scroll-animate">
        <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">Everything a Retail Investor Needs</h2>
        </div>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard title="Chart Pattern Detection" description="Real algorithms, not AI guessing, find proven technical patterns." icon={<div className="text-brand-primary">📈</div>} />
            <FeatureCard title="Historical Backtesting" description="See historical win rates and performance for every signal on every stock." icon={<div className="text-brand-primary">📜</div>} />
            <FeatureCard title="Plain-English AI Explanations" description="Beginner-friendly summaries of what each signal means." icon={<div className="text-brand-primary">🤖</div>} />
            <FeatureCard title="Conviction Scoring" description="Signals are ranked by a confidence score so you can focus on the best." icon={<div className="text-brand-primary">🎯</div>} />
            <FeatureCard title="AI Market Video" description="A 60-second daily video summary of the market's top signals." icon={<div className="text-brand-primary">🎥</div>} />
            <FeatureCard title="Real-time Alerts" description="Get instant notifications via WhatsApp or email when a new signal appears." icon={<div className="text-brand-primary">🔔</div>} />
        </div>
      </section>

      {/* Section 5: CTA */}
      <section style={{textAlign:'center', padding:'80px 40px'}}>
         <div style={{maxWidth:'768px', margin:'0 auto'}}>
            <h2 style={{fontFamily:"'Space Grotesk', sans-serif", fontSize:'clamp(28px, 4vw, 48px)', fontWeight:'700', color:'#F0F0FF', marginBottom:'16px'}}>Ready to see what the smart money is doing?</h2>
            <p style={{color:'#8B8BA8', marginBottom:'32px', fontSize:'18px'}}>Stop trading on noise and start trading on data.</p>
            <div style={{display:'flex', gap:'16px', justifyContent:'center', marginTop:'32px', flexWrap:'wrap'}}>
                <button 
                  onClick={() => navigate('/signup')}
                  style={{background:'#7C3AED', color:'white', padding:'14px 28px', borderRadius:'10px', border:'none', fontSize:'15px', fontWeight:'600', cursor:'pointer', transition:'all 0.3s ease'}}>
                  Get Started for Free
                </button>
                <button 
                  onClick={() => document.getElementById('features')?.scrollIntoView({behavior:'smooth'})}
                  style={{background:'rgba(255,255,255,0.1)', color:'white', padding:'14px 28px', borderRadius:'10px', border:'none', fontSize:'15px', fontWeight:'600', cursor:'pointer', transition:'all 0.3s ease'}}>
                  Learn More
                </button>
            </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
