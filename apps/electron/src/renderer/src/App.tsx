import React from 'react';
import { TimelinePanel } from './components/timeline/TimelinePanel';

const App: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#1a1a2e',
        color: '#ffffff',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}
        >
          EasyMotion — M2 Timeline
        </h1>
      </div>
      <div style={{ height: '240px', borderTop: '1px solid #2a2a4e' }}>
        <TimelinePanel />
      </div>
    </div>
  );
};

export default App;
