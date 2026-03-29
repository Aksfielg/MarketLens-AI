import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loginWithGoogle, registerWithEmail } from '../firebase';

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.99 12.24c0-1.43-.14-2.83-.4-4.19h-8.6v4.7h4.88c-.21 1.53-.88 2.83-1.95 3.7v3.05h3.9c2.28-2.1 3.57-5.22 3.57-8.26z"/>
        <path d="M12.99 22c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.72-2.09-6.66-4.92H2.25v3.14C4.19 19.89 8.27 22 12.99 22z"/>
        <path d="M6.33 14.31c-.19-.57-.3-1.17-.3-1.81s.11-1.24.3-1.81V7.55H2.25C1.46 9.15 1 10.8 1 12.5s.46 3.35 1.25 4.95l4.08-3.14z"/>
    </svg>
);

const ProgressBar = ({ currentStep }) => (
    <div className="w-full mb-8">
        <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-text-secondary">Step {currentStep} of 3</span>
            <span className="text-sm font-mono text-brand-primary">{Math.round((currentStep/3)*100)}%</span>
        </div>
        <div className="w-full bg-bg-elevated rounded-full h-2">
            <div 
                className="bg-brand-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / 3) * 100}%` }}
            ></div>
        </div>
    </div>
);

const PasswordStrengthIndicator = ({ password }) => {
    const getStrength = () => {
        let score = 0;
        if (!password || password.length < 8) return { label: 'Weak', color: 'bg-red', width: '33%' };
        if (/\d/.test(password)) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        if (password.length > 12) score++;

        if (score < 2) return { label: 'Weak', color: 'bg-red', width: '33%' };
        if (score < 4) return { label: 'Medium', color: 'bg-yellow', width: '66%' };
        return { label: 'Strong', color: 'bg-green', width: '100%' };
    };

    const { label, color, width } = getStrength();

    return (
        <div>
            <div className="w-full bg-bg-elevated rounded-full h-1 mt-2">
                <div className={`h-1 rounded-full ${color} transition-all`} style={{ width }}></div>
            </div>
            <p className={`text-xs mt-1 ${color.replace('bg-', 'text-')}`}>{label}</p>
        </div>
    );
};

const ToggleSwitch = ({ label, description, enabled, setEnabled }) => (
    <div 
        className="flex justify-between items-center p-4 border border-border-subtle rounded-lg cursor-pointer"
        onClick={() => setEnabled(!enabled)}
    >
        <div>
            <p className="font-semibold">{label}</p>
            <p className="text-sm text-text-secondary">{description}</p>
        </div>
        <div className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${enabled ? 'bg-brand-primary' : 'bg-bg-elevated'}`}>
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${enabled ? 'translate-x-6' : ''}`}></div>
        </div>
    </div>
);


const SignupPage = () => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [investorType, setInvestorType] = useState('');
    const [selectedSectors, setSelectedSectors] = useState([]);
    const [notificationPrefs, setNotificationPrefs] = useState({
        dailyDigest: true,
        watchlistAlerts: true,
        weeklyReport: false,
        marketVideo: true,
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const navigate = useNavigate();

    const handleStep1Continue = async () => {
        setError('');
        if (!name || !email || !password) { setError('All fields are required.'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        
        setLoading(true);
        const result = await registerWithEmail(email, password, name);
        if (result.success) {
            setStep(2);  // Go to step 2 (interests)
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    const handleStep2Continue = () => {
        if (!investorType) { setError('Please select your investor type to continue'); return; }
        setError('');
        // Save to localStorage for use across the app
        localStorage.setItem('investorType', investorType);
        localStorage.setItem('selectedSectors', JSON.stringify(selectedSectors));
        setStep(3);
    };

    const handleStartFree = async () => {
        // Save preferences to localStorage
        localStorage.setItem('preferences', JSON.stringify({
            investorType,
            sectors: selectedSectors,
            notifications: notificationPrefs
        }));
        
        // Try to save to backend (don't block if it fails)
        try {
            const token = localStorage.getItem('token');
            await fetch('/api/user/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ investorType, sectors: selectedSectors })
            });
        } catch (err) {
            console.log('Preferences save failed, continuing anyway');
        }
        
        // Navigate to dashboard regardless
        navigate('/dashboard');
    };

    const toggleSector = (sector) => {
        setSelectedSectors(prev => 
            prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]
        );
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


    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="animate-fade-in">
                        <h1 className="font-display text-3xl font-bold mb-2">Create your account</h1>
                        <p className="text-text-secondary mb-8">Start your 7-day free trial. No credit card required.</p>
                        
                        <button onClick={handleGoogleLogin} disabled={googleLoading} className="w-full flex items-center justify-center gap-2 p-3 border border-border-default rounded-lg hover:bg-bg-elevated transition-colors mb-6">
                            <GoogleIcon />
                            {googleLoading ? 'Signing up...' : 'Sign up with Google'}
                        </button>

                        <div className="flex items-center my-4">
                            <hr className="w-full border-border-subtle"/>
                            <p className="px-4 text-text-secondary text-sm">OR</p>
                            <hr className="w-full border-border-subtle"/>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); handleStep1Continue(); }}>
                            <div className="space-y-4">
                                <input 
                                    type="text" 
                                    placeholder="Full Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full p-3 bg-bg-elevated border border-transparent focus:border-brand-primary rounded-lg outline-none"
                                />
                                <input 
                                    type="email" 
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full p-3 bg-bg-elevated border border-transparent focus:border-brand-primary rounded-lg outline-none"
                                />
                                <input 
                                    type="password" 
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full p-3 bg-bg-elevated border border-transparent focus:border-brand-primary rounded-lg outline-none"
                                />
                                <PasswordStrengthIndicator password={password} />
                                <input 
                                    type="password" 
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full p-3 bg-bg-elevated border border-transparent focus:border-brand-primary rounded-lg outline-none"
                                />
                            </div>
                            {error && <p className="text-red text-sm mt-4">{error}</p>}
                            <button type="submit" disabled={loading} className="w-full btn-primary mt-6">
                                {loading ? 'Creating Account...' : 'Continue'}
                            </button>
                        </form>
                    </div>
                );
            case 2:
                return (
                    <div className="animate-fade-in">
                        <h1 className="font-display text-3xl font-bold mb-2">Tell us about yourself</h1>
                        <p className="text-text-secondary mb-8">This helps us personalize your experience.</p>
                        <div className="mb-8">
                            <h3 className="font-semibold mb-3">What best describes you?</h3>
                            <div style={{display:'flex', gap:'12px', flexWrap:'wrap'}}>
                            {[
                              {id:'beginner', label:'Beginner Investor', desc:'I am learning about stocks', icon:'🌱'},
                              {id:'active', label:'Active Trader', desc:'I trade regularly', icon:'⚡'},
                              {id:'longterm', label:'Long-term Investor', desc:'I invest for the long run', icon:'🎯'},
                            ].map(type => (
                              <div
                                key={type.id}
                                onClick={() => setInvestorType(type.id)}
                                style={{
                                  padding: '20px',
                                  borderRadius: '12px',
                                  border: `2px solid ${investorType === type.id ? '#00D4AA' : 'rgba(255,255,255,0.1)'}`,
                                  background: investorType === type.id ? 'rgba(0,212,170,0.08)' : 'rgba(255,255,255,0.03)',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  textAlign: 'center',
                                  flex: 1,
                                  minWidth: '120px'
                                }}
                              >
                                <div style={{fontSize:'24px', marginBottom:'8px'}}>{type.icon}</div>
                                <div style={{color: investorType===type.id ? '#00D4AA' : 'white', fontWeight:'600', fontSize:'14px', marginBottom:'4px'}}>
                                  {type.label}
                                </div>
                                <div style={{color:'#8B8BA8', fontSize:'12px'}}>{type.desc}</div>
                                {investorType === type.id && (
                                  <div style={{color:'#00D4AA', fontSize:'20px', marginTop:'8px'}}>✓</div>
                                )}
                              </div>
                            ))}
                            </div>
                        </div>
                        <div className="mb-8">
                            <h3 className="font-semibold mb-3">Which sectors interest you?</h3>
                            <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
                            {['Banking','IT','Pharma','Auto','FMCG','Energy','Metals','Telecom'].map(sector => (
                              <span
                                key={sector}
                                onClick={() => toggleSector(sector)}
                                style={{
                                  padding: '6px 16px',
                                  borderRadius: '20px',
                                  border: `1px solid ${selectedSectors.includes(sector) ? '#00D4AA' : 'rgba(255,255,255,0.15)'}`,
                                  background: selectedSectors.includes(sector) ? 'rgba(0,212,170,0.15)' : 'transparent',
                                  color: selectedSectors.includes(sector) ? '#00D4AA' : '#8B8BA8',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  fontWeight: selectedSectors.includes(sector) ? '600' : '400',
                                  transition: 'all 0.15s',
                                  userSelect: 'none'
                                }}
                              >
                                {selectedSectors.includes(sector) ? '✓ ' : ''}{sector}
                              </span>
                            ))}
                            </div>
                        </div>
                        {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
                        <button onClick={handleStep2Continue} className="w-full btn-primary !py-3 !text-base !font-bold mt-6">Continue →</button>
                    </div>
                );
            case 3:
                return (
                    <div>
                        <h1 className="font-display text-3xl font-bold mb-2">Notification Preferences</h1>
                        <p className="text-text-secondary mb-8">Stay updated without the noise. You can change these anytime.</p>
                        <div className="space-y-4">
                            <ToggleSwitch label="Daily morning signal digest" description="Get a summary of top signals every morning." enabled={notificationPrefs.dailyDigest} setEnabled={val => setNotificationPrefs({...notificationPrefs, dailyDigest: val})} />
                            <ToggleSwitch label="Breakout alerts on my watchlist" description="Instant alerts for stocks you follow." enabled={notificationPrefs.watchlistAlerts} setEnabled={val => setNotificationPrefs({...notificationPrefs, watchlistAlerts: val})} />
                            <ToggleSwitch label="Weekly performance report" description="A summary of your portfolio and watchlist performance." enabled={notificationPrefs.weeklyReport} setEnabled={val => setNotificationPrefs({...notificationPrefs, weeklyReport: val})} />
                            <ToggleSwitch label="AI Market Video" description="Link to the daily 60-second video summary." enabled={notificationPrefs.marketVideo} setEnabled={val => setNotificationPrefs({...notificationPrefs, marketVideo: val})} />
                        </div>
                        <button onClick={handleStartFree} className="w-full btn-primary !py-3 !text-lg !font-bold mt-8">Start Free →</button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-bg-surface flex flex-col justify-center items-center p-6 sm:p-12">
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
                
                <ProgressBar currentStep={step} />

                {renderStep()}

                <p className="text-center text-sm text-text-secondary mt-8">
                    Already have an account? <Link to="/login" className="text-brand-primary font-semibold hover:underline">Log in</Link>
                </p>
            </div>
        </div>
    )
}

export default SignupPage;
