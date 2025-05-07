import React, { useState, useEffect } from 'react';

/**
 * DDA Debug Panel: Shows current DDA state, allows tuning, and displays event logs.
 * Usage: <DDADebugPanel dda={window.DDA} />
 * Toggle with F5.
 */
export default function DDADebugPanel({ dda }) {
  const [visible, setVisible] = useState(false);
  const [threshold, setThreshold] = useState(dda?.threshold || 1.0);
  const [log, setLog] = useState([]);
  const [dummy, setDummy] = useState(0); // force update

  // Listen for DDA events if supported
  useEffect(() => {
    if (dda && dda.onEvent) {
      const handler = (event) => setLog((prev) => [...prev, event]);
      dda.onEvent(handler);
      return () => dda.offEvent(handler);
    }
  }, [dda]);

  // Keyboard toggle (F5)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F5') setVisible((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Poll DDA state every 0.5s for live updates (if not event-driven)
  useEffect(() => {
    if (!dda) return;
    const interval = setInterval(() => setDummy((d) => d + 1), 500);
    return () => clearInterval(interval);
  }, [dda]);

  if (!visible || !dda) return null;

  return (
    <div style={{
      position: 'fixed', top: 60, right: 30, zIndex: 2000,
      background: 'rgba(20,20,40,0.98)', color: '#fff', padding: 18, borderRadius: 12, minWidth: 320,
      fontFamily: 'monospace', boxShadow: '0 2px 18px #000a', border: '1.5px solid #0ff'
    }}>
      <h3 style={{marginTop:0, marginBottom:8}}>DDA Debug Panel</h3>
      <div>Current Difficulty: <b>{dda.currentDifficulty ?? 'N/A'}</b></div>
      <div>Player Score: {dda.playerScore ?? 'N/A'}</div>
      <div>AI Aggression: {dda.aiAggression ?? 'N/A'}</div>
      <div>Recent Change: {dda.lastChange ?? 'N/A'}</div>
      <div style={{marginTop:10}}>
        <label>
          Threshold:
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.01"
            value={threshold}
            onChange={e => {
              setThreshold(e.target.value);
              dda.setThreshold && dda.setThreshold(Number(e.target.value));
            }}
            style={{marginLeft:8, marginRight:8}}
          />
          {threshold}
        </label>
      </div>
      <div style={{ marginTop: 14, maxHeight: 120, overflowY: 'auto', background: '#111', padding: 8, borderRadius: 6, fontSize: '13px' }}>
        <b>Recent DDA Events:</b>
        <ul style={{margin:0, paddingLeft:18}}>
          {log.slice(-10).map((evt, i) => <li key={i}>{typeof evt === 'string' ? evt : JSON.stringify(evt)}</li>)}
        </ul>
      </div>
      <button onClick={() => setVisible(false)} style={{ marginTop: 10, background:'#223', color:'#fff', border:'1px solid #0ff', borderRadius:6, padding:'4px 14px', cursor:'pointer' }}>Close</button>
    </div>
  );
}
