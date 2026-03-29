import React from 'react';

function App() {
  return (
    <div style={{ padding: '20px', background: '#060611', color: '#F0F0FF', minHeight: '100vh' }}>
      <h1 style={{ color: '#00D4AA' }}>MarketLens AI - Test Version</h1>
      <p>If you can see this, React is working!</p>
      <div style={{ background: '#12121F', padding: '20px', borderRadius: '10px', marginTop: '20px' }}>
        <h2>Environment Test:</h2>
        <p>Firebase API Key: {import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Loaded' : '❌ Missing'}</p>
        <p>Gemini API Key: {import.meta.env.VITE_GEMINI_API_KEY ? '✅ Loaded' : '❌ Missing'}</p>
      </div>
    </div>
  );
}

export default App;
