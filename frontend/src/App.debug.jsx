import React from 'react';

function App() {
  console.log('App component is rendering...');
  return (
    <div style={{ padding: '20px', background: '#060611', color: '#F0F0FF', minHeight: '100vh' }}>
      <h1 style={{ color: '#00D4AA' }}>MarketLens AI Debug</h1>
      <p>Current time: {new Date().toLocaleTimeString()}</p>
      <p>If you see this, React is working!</p>
    </div>
  );
}

export default App;
