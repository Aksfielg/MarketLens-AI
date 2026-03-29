import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Simple components for testing
const SimpleLanding = () => (
  <div style={{ padding: '40px', background: '#060611', color: '#F0F0FF', minHeight: '100vh' }}>
    <h1 style={{ color: '#00D4AA', fontSize: '48px', marginBottom: '20px' }}>MarketLens AI</h1>
    <p style={{ fontSize: '18px', marginBottom: '30px' }}>AI-Powered Market Intelligence Platform</p>
    <div style={{ display: 'flex', gap: '20px' }}>
      <button style={{ background: '#00D4AA', color: '#060611', padding: '12px 24px', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600' }}>
        Get Started
      </button>
      <button style={{ background: 'transparent', color: '#00D4AA', padding: '12px 24px', border: '1px solid #00D4AA', borderRadius: '8px', fontSize: '16px', fontWeight: '600' }}>
        Learn More
      </button>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SimpleLanding />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
