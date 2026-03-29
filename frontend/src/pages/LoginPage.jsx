import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { loginWithGoogle, loginWithEmail } from '../firebase';

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.99 12.24c0-1.43-.14-2.83-.4-4.19h-8.6v4.7h4.88c-.21 1.53-.88 2.83-1.95 3.7v3.05h3.9c2.28-2.1 3.57-5.22 3.57-8.26z"/>
        <path d="M12.99 22c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.72-2.09-6.66-4.92H2.25v3.14C4.19 19.89 8.27 22 12.99 22z"/>
        <path d="M6.33 14.31c-.19-.57-.3-1.17-.3-1.81s.11-1.24.3-1.81V7.55H2.25C1.46 9.15 1 10.8 1 12.5s.46 3.35 1.25 4.95l4.08-3.14z"/>
    </svg>
);

const SignalCard = ({ stock, pattern, score, delay }) => (
    <div 
        className="card p-4 border border-border-subtle rounded-lg shadow-lg floating-card"
        style={{ animationDelay: `${delay}s`, boxShadow: '0 0 30px rgba(0,212,170,0.08)' }}
    >
        <div className="flex justify-between items-center">
            <div>
                <p className="font-display font-bold text-lg">{stock}</p>
                <p className="text-text-secondary text-sm">{pattern}</p>
            </div>
            <div className="badge-bull">{score}</div>
        </div>
    </div>
);

const LoginPage = () => {
  const [authMethod, setAuthMethod] = useState('email'); // 'email' or 'mobile'
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();  // CRITICAL: prevents page reload
    setLoading(true);
    setError('');
    
    if (!email || !password) {
      setError('Please enter both email and password.');
      setLoading(false);
      return;
    }
    
    const result = await loginWithEmail(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Google error code:', err.code);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked. Please allow popups for this site in your browser settings.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('Sign-in was cancelled. Please try again.');
      } else {
        setError('Google sign-in failed: ' + err.message);
      }
    }
    setGoogleLoading(false);
  };
  
  // Placeholder for OTP logic
  const handleSendOtp = () => { console.log("Sending OTP to", phone); };
  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return false;
    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);
    // Focus next input
    if (element.nextSibling) {
      element.nextSibling.focus();
    }
  };


  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(-10px); } 50% { transform: translateY(10px); } }
        .floating-card { animation: float 8s ease-in-out infinite; }
      `}</style>
      {/* Left Half */}
      <div className="hidden lg:flex flex-col justify-center items-center bg-bg-base p-12 relative overflow-hidden">
        <div 
            className="absolute -bottom-20 -left-20 w-80 h-80 bg-brand-primary/10 rounded-full"
            style={{ filter: 'blur(100px)' }}
        ></div>
        <div className="relative z-10 w-full max-w-md">
            <h1 className="font-display text-3xl leading-snug text-text-primary mb-8">
                "The best investment you can make is in <span className="text-brand-primary">understanding the market.</span>"
            </h1>
            <div className="space-y-4">
                <SignalCard stock="RELIANCE" pattern="RSI Divergence" score="87" delay={0} />
                <SignalCard stock="HDFCBANK" pattern="Volume Breakout" score="79" delay={1.5} />
                <SignalCard stock="TCS" pattern="MACD Crossover" score="72" delay={0.5} />
            </div>
        </div>
      </div>

      {/* Right Half */}
      <div className="bg-bg-surface flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md">
            <div className="text-center mb-8">
                <div style={{display:'flex', alignItems:'center', justifyContent: 'center', gap:'8px'}}>
                  {/* Logo text */}
                  <span style={{
                    fontFamily:"'Space Grotesk', sans-serif",
                    fontSize:'18px', fontWeight:'700',
                    color:'#F0F0FF', letterSpacing:'-0.3px'
                  }}>
                    Market<span style={{color:'#00D4AA'}}>Lens</span>
                    <span style={{
                      fontSize:'11px', fontWeight:'600',
                      background:'linear-gradient(135deg,#00D4AA,#7C3AED)',
                      WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                      marginLeft:'3px', verticalAlign:'super'
                    }}>AI</span>
                  </span>
                </div>
            </div>
            <h1 className="font-display text-3xl font-bold mb-2">Welcome back</h1>
            <p className="text-text-secondary mb-8">Sign in to see today's signals</p>

            <button onClick={handleGoogleLogin} disabled={googleLoading} className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-black rounded-md border border-border-default hover:shadow-lg transition-shadow">
                <GoogleIcon />
                <span className="font-semibold text-sm">{googleLoading ? 'Signing in...' : 'Continue with Google'}</span>
            </button>

            <div className="my-6 flex items-center gap-4">
                <hr className="w-full border-border-subtle" />
                <span className="text-text-muted text-xs">OR</span>
                <hr className="w-full border-border-subtle" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="email" className="text-sm text-text-secondary mb-2 block">Email Address</label>
                    <input 
                        type="email" 
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-bg-base p-3 rounded-md border border-border-subtle focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30 outline-none transition"
                        placeholder="you@example.com"
                        required
                    />
                </div>
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="password"className="text-sm text-text-secondary">Password</label>
                        <Link to="/forgot-password" tabIndex={-1} className="text-xs text-brand-primary hover:underline">Forgot password?</Link>
                    </div>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"}
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-bg-base p-3 rounded-md border border-border-subtle focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30 outline-none transition"
                            placeholder="••••••••"
                            required
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>
                
                {error && <p className="text-red text-sm mb-4">{error}</p>}

                <button type="submit" disabled={loading} className="w-full btn-primary !py-3 !text-base !font-bold mt-2">
                    {loading ? 'Signing In...' : 'Sign In'}
                </button>
            </form>
            
            <p className="text-center text-sm text-text-secondary mt-8">
                Don't have an account? <Link to="/signup" className="text-brand-primary font-semibold hover:underline">Sign up</Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
