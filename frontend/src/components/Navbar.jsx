import { useRef, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, Video, BarChart2, Briefcase, LogOut, Settings, User, X } from 'lucide-react';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const [showProfile, setShowProfile] = useState(false);
  const [watchlistPrices, setWatchlistPrices] = useState({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch real-time prices for watchlist
  const fetchWatchlistPrices = async () => {
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    if (watchlist.length === 0) return;
    
    setPricesLoading(true);
    const prices = {};
    
    for (const symbol of watchlist) {
      try {
        const response = await fetch(`http://localhost:8000/api/stock-price/${symbol}`);
        const data = await response.json();
        if (!data.error) {
          prices[symbol] = { price: data.price, change: data.change_pct || 0 };
        } else {
          prices[symbol] = { price: 'N/A', change: 0 };
        }
      } catch (error) {
        console.log(`Failed to fetch price for ${symbol}`);
        prices[symbol] = { price: 'N/A', change: 0 };
      }
    }
    
    setWatchlistPrices(prices);
    setPricesLoading(false);
  };

  // Fetch prices on component mount and set up interval
  useEffect(() => {
    fetchWatchlistPrices();
    const interval = setInterval(fetchWatchlistPrices, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const investorType = localStorage.getItem('investorType') || 'beginner';
  const investorLabel = {beginner:'Beginner Investor', active:'Active Trader', longterm:'Long-term Investor'}[investorType] || 'Investor';
  const initials = (user.name || user.email || 'U').slice(0,1).toUpperCase();

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'AI Studio', path: '/ai-studio' },
    { label: 'Portfolio', path: '/portfolio' },
    { label: 'Alerts', path: '/alerts' },
  ];

  const isLoggedIn = !!localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const notifications = [
      { id: 1, stock: 'TCS', pattern: 'RSI Divergence', time: '5m ago' },
      { id: 2, stock: 'INFY', pattern: 'Price > ₹1650', time: '1h ago' },
      { id: 3, stock: 'SBIN', pattern: 'MACD Crossover', time: '3h ago' },
  ];

  // Get watchlist from localStorage
  const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');

  return (
    <nav className="fixed top-0 left-0 right-0 h-[60px] px-4 md:px-6 flex items-center justify-between z-[1000] bg-gray-900/80 backdrop-blur-lg border-b border-gray-700/50">
      {/* Left Section */}
      <div className="flex items-center">
        <Link to="/" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
            {/* Animated pulsing dot */}
            <div style={{
              width:'10px', height:'10px', borderRadius:'50%',
              background:'#00D4AA',
              boxShadow:'0 0 0 0 rgba(0,212,170,0.4)',
              animation:'logoPulse 2s infinite'
            }}/>
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
        </Link>
      </div>

      {/* Center Section (Desktop) */}
      <div className="hidden lg:flex items-center space-x-6">
        {isLoggedIn && navLinks.map(link => (
          <Link 
            key={link.path} 
            to={link.path}
            style={{
              color: location.pathname === link.path ? '#00D4AA' : '#8B8BA8',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: location.pathname === link.path ? '500' : '400',
              transition: 'color 0.15s'
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {isLoggedIn ? (
          <>
            <div className="relative">
              <button onClick={() => setIsNotificationOpen(!isNotificationOpen)} className="text-gray-400 hover:text-white">
                <Bell />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs">{unreadCount}</span>
                )}
              </button>
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-2">
                  <div className="px-4 py-2 flex justify-between items-center border-b border-gray-700">
                    <h4 className="font-semibold">Notifications</h4>
                    <button onClick={() => setUnreadCount(0)} className="text-xs text-indigo-400 hover:text-indigo-300">Mark all read</button>
                  </div>
                  <div className="divide-y divide-gray-700">
                    {notifications.map(n => (
                      <div key={n.id} className="px-4 py-3 hover:bg-gray-700/50">
                        <p className="font-semibold text-sm">{n.stock} - <span className="font-normal">{n.pattern}</span></p>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-400">{n.time}</p>
                          <Link to="/alerts" className="text-xs text-indigo-400 hover:underline">View →</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div ref={profileRef} style={{position:'relative'}}>
              {/* Avatar button */}
              <div
                onClick={() => setShowProfile(!showProfile)}
                style={{
                  width:'36px', height:'36px', borderRadius:'50%',
                  background: 'linear-gradient(135deg, #7C3AED, #00D4AA)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'14px', fontWeight:'700', color:'white', cursor:'pointer',
                  border: showProfile ? '2px solid #00D4AA' : '2px solid transparent',
                  transition: 'border 0.15s'
                }}
              >{initials}</div>
              
              {/* Dropdown */}
              {showProfile && (
                <div style={{
                  position:'absolute', right:0, top:'44px', width:'260px',
                  background:'#1A1A2E', border:'1px solid rgba(255,255,255,0.1)',
                  borderRadius:'12px', zIndex:1000, overflow:'hidden',
                  boxShadow:'0 20px 60px rgba(0,0,0,0.5)'
                }}>
                  
                  {/* User info */}
                  <div style={{padding:'16px', borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                      <div style={{width:'44px',height:'44px',borderRadius:'50%',background:'linear-gradient(135deg,#7C3AED,#00D4AA)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',fontWeight:'700',color:'white'}}>{initials}</div>
                      <div>
                        <div style={{color:'white',fontWeight:'600',fontSize:'14px'}}>{user.name || 'Investor'}</div>
                        <div style={{color:'#8B8BA8',fontSize:'12px',marginTop:'2px'}}>{user.email || ''}</div>
                        <div style={{color:'#00D4AA',fontSize:'11px',marginTop:'4px',fontWeight:'500'}}>{investorLabel}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div style={{padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', gap:'16px'}}>
                    <div style={{textAlign:'center'}}>
                      <div style={{color:'#00D4AA',fontWeight:'700',fontSize:'16px'}}>{JSON.parse(localStorage.getItem('watchlist')||'[]').length}</div>
                      <div style={{color:'#8B8BA8',fontSize:'11px'}}>Watchlist</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div style={{color:'#00D4AA',fontWeight:'700',fontSize:'16px'}}>{JSON.parse(localStorage.getItem('portfolio')||'[]').length}</div>
                      <div style={{color:'#8B8BA8',fontSize:'11px'}}>Portfolio</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div style={{color:'#00D4AA',fontWeight:'700',fontSize:'16px'}}>{JSON.parse(localStorage.getItem('alerts')||'[]').length}</div>
                      <div style={{color:'#8B8BA8',fontSize:'11px'}}>Alerts</div>
                    </div>
                  </div>
                  
                  {/* Watchlist Section */}
                  {watchlist.length > 0 && (
                    <div style={{borderTop:'1px solid rgba(255,255,255,0.08)'}}>
                      <div style={{padding:'8px 16px 4px',fontSize:'11px',fontWeight:'600',color:'#8B8BA8',letterSpacing:'0.05em',textTransform:'uppercase'}}>
                        ⭐ My Watchlist ({watchlist.length})
                      </div>
                      
                      {watchlist.slice(0,5).map(sym => {
                        const data = watchlistPrices[sym] || {price:'N/A', change:0};
                        const up = data.change >= 0;
                        const priceDisplay = data.price === 'N/A' ? 'N/A' : 
                                          typeof data.price === 'number' ? data.price.toFixed(0) : data.price;
                        return (
                          <div key={sym}
                            onClick={() => {navigate(`/stock/${sym}`); setShowProfile(false);}}
                            style={{padding:'8px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',transition:'background 0.15s'}}
                            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                            onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                          >
                            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                              <div style={{width:'28px',height:'28px',borderRadius:'6px',background:'rgba(0,212,170,0.1)',border:'1px solid rgba(0,212,170,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:'700',color:'#00D4AA'}}>
                                {sym.slice(0,3)}
                              </div>
                              <div>
                                <div style={{color:'white',fontSize:'12px',fontWeight:'600'}}>{sym}</div>
                                <div style={{color:'#8B8BA8',fontSize:'11px'}}>
                                  {pricesLoading ? 'Loading...' : `₹${priceDisplay}`}
                                </div>
                              </div>
                            </div>
                            <div style={{textAlign:'right'}}>
                              <div style={{color:up?'#00D4AA':'#FF4560',fontSize:'12px',fontWeight:'600'}}>
                                {!pricesLoading && (up?'+':'')}{data.change}%
                              </div>
                              <div style={{color:'#8B8BA8',fontSize:'10px'}}>View →</div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {watchlist.length > 5 && (
                        <div style={{padding:'6px 16px',color:'#00D4AA',fontSize:'11px',cursor:'pointer'}}
                          onClick={() => {navigate('/dashboard'); setShowProfile(false);}}>
                          +{watchlist.length - 5} more stocks →
                        </div>
                      )}
                      
                      {/* Clear watchlist option */}
                      <div style={{padding:'6px 16px 8px'}}>
                        <span style={{color:'#8B8BA8',fontSize:'11px',cursor:'pointer'}}
                          onClick={() => {localStorage.setItem('watchlist','[]'); window.location.reload();}}>
                          Clear watchlist
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {watchlist.length === 0 && (
                    <div style={{borderTop:'1px solid rgba(255,255,255,0.08)',padding:'12px 16px'}}>
                      <div style={{color:'#8B8BA8',fontSize:'12px',textAlign:'center'}}>
                        ⭐ No stocks in watchlist yet<br/>
                        <span style={{fontSize:'11px',color:'#00D4AA',cursor:'pointer'}} onClick={() => {navigate('/dashboard');setShowProfile(false);}}>
                          Browse signals to add stocks →
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Menu items */}
                  {[
                    {icon:'📊', label:'My Dashboard', action:() => {navigate('/dashboard'); setShowProfile(false);}},
                    {icon:'💼', label:'Portfolio', action:() => {navigate('/portfolio'); setShowProfile(false);}},
                    {icon:'🔔', label:'Alerts', action:() => {navigate('/alerts'); setShowProfile(false);}},
                    {icon:'⚙️', label:'Account Settings', action:() => setShowProfile(false)},
                  ].map(item => (
                    <div key={item.label} onClick={item.action} style={{padding:'10px 16px',display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',transition:'background 0.15s'}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <span style={{fontSize:'16px'}}>{item.icon}</span>
                      <span style={{color:'#F0F0FF',fontSize:'13px'}}>{item.label}</span>
                    </div>
                  ))}
                  
                  {/* Logout */}
                  <div style={{borderTop:'1px solid rgba(255,255,255,0.08)'}}>
                    <div onClick={() => {localStorage.clear(); navigate('/'); setShowProfile(false);}}
                      style={{padding:'10px 16px',display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',color:'#FF4560'}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,69,96,0.08)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <span style={{fontSize:'16px'}}>🚪</span>
                      <span style={{fontSize:'13px'}}>Sign Out</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="hidden md:flex items-center space-x-2">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white">Login</Link>
            <Link to="/signup" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">Get Started</Link>
          </div>
        )}
        
        {/* Mobile Hamburger */}
        <div className="lg:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="absolute top-0 left-0 w-full h-screen bg-gray-900 p-6 lg:hidden">
            <div className="flex justify-between items-center mb-8">
                <h1 className="font-display text-xl font-bold">Menu</h1>
                <button onClick={() => setIsMenuOpen(false)}><X/></button>
            </div>
            <div className="flex flex-col space-y-4">
                {isLoggedIn && navLinks.map(link => (
                  <Link 
                    key={link.path} 
                    to={link.path} 
                    onClick={() => setIsMenuOpen(false)} 
                    className="flex items-center space-x-3 text-lg"
                    style={{
                      color: location.pathname === link.path ? '#00D4AA' : '#F0F0FF'
                    }}
                  >
                    {link.label === 'Dashboard' && <BarChart2/>}
                    {link.label === 'AI Studio' && <Video/>}
                    {link.label === 'Portfolio' && <Briefcase/>}
                    {link.label === 'Alerts' && <Bell/>}
                    <span>{link.label}</span>
                  </Link>
                ))}
                <hr className="border-gray-700"/>
                {isLoggedIn ? (
                    <>
                        <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="flex items-center space-x-3 text-lg"><User/><span>Profile</span></Link>
                        <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="flex items-center space-x-3 text-lg text-red-500"><LogOut/><span>Logout</span></button>
                    </>
                ) : (
                    <>
                        <Link to="/login" onClick={() => setIsMenuOpen(false)} className="flex items-center space-x-3 text-lg"><span>Login</span></Link>
                        <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="flex items-center space-x-3 text-lg"><span>Sign Up</span></Link>
                    </>
                )}
            </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
