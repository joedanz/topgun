import React, { useState, useEffect } from 'react';

/**
 * DDA Debug Panel: Shows current DDA state, allows tuning, and displays event logs.
 * Usage: <DDADebugPanel dda={window.DDA} />
 * Toggle with F5.
 */
export default function DDADebugPanel() {
  const [visible, setVisible] = useState(false);
  const [log, setLog] = useState([]);
  const [dummy, setDummy] = useState(0); // force update

  // Listen for PlayerPerformanceTracker events
  useEffect(() => {
    const tracker = window.PlayerPerformanceTracker;
    if (tracker && tracker.onEvent) {
      const handler = (event) => setLog((prev) => [...prev, event]);
      tracker.onEvent(handler);
      return () => {
        // No offEvent, so no-op
      };
    }
  }, []);

  // Listen for DifficultyManager changes
  useEffect(() => {
    const mgr = window.DifficultyManager;
    if (mgr && mgr.onChange) {
      const handler = (preset) => setLog((prev) => [...prev, { type: 'difficultyChange', preset, timestamp: Date.now() }]);
      mgr.onChange(handler);
      return () => {
        // No offChange, so no-op
      };
    }
  }, []);

  // Keyboard toggle (` key)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '`' && !e.ctrlKey && !e.metaKey && !e.altKey) setVisible((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Poll for live updates
  useEffect(() => {
    const interval = setInterval(() => setDummy((d) => d + 1), 500);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  const tracker = window.PlayerPerformanceTracker;
  const mgr = window.DifficultyManager;
  const stats = tracker ? tracker.getStats() : {};
  const difficulty = mgr ? mgr.current : 'N/A';
  const preset = mgr && mgr.getCurrent ? mgr.getCurrent() : {};

  return (
    <div style={{
      position: 'fixed', top: 60, right: 30, zIndex: 2000,
      background: 'rgba(20,20,40,0.98)', color: '#fff', padding: 18, borderRadius: 12, minWidth: 340,
      fontFamily: 'monospace', boxShadow: '0 2px 18px #000a', border: '1.5px solid #0ff'
    }}>
      <h3 style={{marginTop:0, marginBottom:8}}>AI Difficulty Debug Panel <span style={{fontWeight:400, fontSize:'0.85em', color:'#0ff'}}>(press <b>`</b> to toggle)</span></h3>
      <div style={{marginBottom:8}}>
        <b>Current Difficulty:</b> <span style={{color:'#0ff'}}>{difficulty}</span>
        <span style={{marginLeft:10, color:'#aaa', fontSize:'0.95em'}}>({preset.label || ''})</span>
      </div>
      <div style={{marginBottom:10}}>
        <b>Player Stats:</b>
        <ul style={{margin:0, paddingLeft:18, fontSize:'14px'}}>
          <li>Kills: {stats.kills ?? 0}</li>
          <li>Deaths: {stats.deaths ?? 0}</li>
          <li>Score: {stats.score ?? 0}</li>
          <li>Streak: {stats.streak ?? 0}</li>
          <li>Missions Completed: {stats.missionsCompleted ?? 0}</li>
          <li>Missions Failed: {stats.missionsFailed ?? 0}</li>
          <li>Hit Accuracy: {typeof stats.hitAccuracy === 'number' ? (stats.hitAccuracy * 100).toFixed(1) + '%' : 'N/A'}</li>
        </ul>
      </div>
      <div style={{marginBottom:12}}>
        <b>Current AI Preset:</b>
        <ul style={{margin:0, paddingLeft:18, fontSize:'14px'}}>
          <li>Reaction Time: {preset.reactionTime ?? 'N/A'}s</li>
          <li>Aim Accuracy: {preset.aimAccuracy ?? 'N/A'}</li>
          <li>Maneuver Aggression: {preset.maneuverAggression ?? 'N/A'}</li>
          <li>Tactical Complexity: {preset.tacticalComplexity ?? 'N/A'}</li>
          <li>Speed Multiplier: {preset.maxSpeedMultiplier ?? 'N/A'}</li>
          <li>Turn Rate Multiplier: {preset.maxTurnRateMultiplier ?? 'N/A'}</li>
        </ul>
      </div>
      <div style={{ marginTop: 8, maxHeight: 120, overflowY: 'auto', background: '#111', padding: 8, borderRadius: 6, fontSize: '13px' }}>
        <b>Recent Events:</b>
        <ul style={{margin:0, paddingLeft:18}}>
          {log.slice(-10).map((evt, i) => <li key={i}>{typeof evt === 'string' ? evt : JSON.stringify(evt)}</li>)}
        </ul>
      </div>
      <button onClick={() => setVisible(false)} style={{ marginTop: 10, background:'#223', color:'#fff', border:'1px solid #0ff', borderRadius:6, padding:'4px 14px', cursor:'pointer' }}>Close</button>
    </div>
  );
}
