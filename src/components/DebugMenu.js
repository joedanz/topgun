import React, { useState } from 'react';

/**
 * DebugMenu
 * Visualizes AI evasion status and terrain checks for all enemies.
 * Props:
 *   enemies: array of EnemyAircraft instances
 *   camera: THREE.Camera
 */
export default function DebugMenu({ enemies = [], camera }) {
  const [show, setShow] = useState(true);

  if (!show) return (
    <button className="debug-menu-toggle" onClick={() => setShow(true)} style={{position:'fixed',top:12,right:12,zIndex:2001}}>Debug</button>
  );

  return (
    <div className="debug-menu-panel" style={{position:'fixed',top:12,right:12,zIndex:2001,background:'#1e2638ee',color:'#fff',padding:'18px 22px',borderRadius:12,minWidth:340,maxWidth:420,fontFamily:'monospace',fontSize:15,boxShadow:'0 2px 18px #000a'}}>
      <button className="debug-menu-close" onClick={() => setShow(false)} style={{position:'absolute',top:6,right:10,fontSize:18,background:'none',border:'none',color:'#fff',cursor:'pointer'}}>×</button>
      <div style={{fontWeight:'bold',fontSize:19,marginBottom:6}}>AI Debug / Terrain Check</div>
      {enemies.length === 0 && <div style={{color:'#ffb',padding:'8px 0'}}>No enemy aircraft detected.</div>}
      {enemies.map(enemy => (
        <div key={enemy.id} style={{marginBottom:12,padding:'8px 0',borderBottom:'1px solid #2346'}}>
          <div><b>ID:</b> {enemy.id} <b>State:</b> {enemy.stateDebug || enemy.stateName || '?'}</div>
          <div><b>Altitude:</b> {enemy.position.y.toFixed(1)} m</div>
          <div><b>Evasion:</b> {enemy.evasionActive ? <span style={{color:'#0f6'}}>ACTIVE</span> : <span style={{color:'#aaa'}}>Idle</span>}</div>
          <div><b>Terrain OK for Negative Pitch:</b> {enemy._canPerformNegativePitchManeuver() ? <span style={{color:'#0f6'}}>Yes</span> : <span style={{color:'#f66'}}>NO</span>}</div>
          {enemy._maneuverLabelDiv && <div style={{color:'#0ff'}}>Maneuver: {enemy._maneuverLabelDiv.innerText}</div>}
        </div>
      ))}
    </div>
  );
}
