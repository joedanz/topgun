// src/components/TargetingSystem.js
import React from 'react';
import './TargetingSystem.css';

/**
 * @param {Object[]} enemies - Array of enemy objects with {id, screenX, screenY, distance, onScreen, inRange}
 * @param {boolean} hoverTarget - Is the player hovering a targetable object?
 */
import { useEffect, useRef, useState } from 'react';

export function TargetingSystem({ enemies = [], hoverTarget = false, hitMarker = false, soundEnabled = false, lockedTargetId = null, lockStatus = 'none', lockProgress = 0, onSetLockedTarget }) {
  // Play lock-on sound when an enemy enters inRange
  const prevInRangeIds = useRef(new Set());
  useEffect(() => {
    if (!soundEnabled) return;
    const audio = new Audio('/sounds/lockon.mp3');
    enemies.forEach(e => {
      if (e.inRange && !prevInRangeIds.current.has(e.id)) {
        audio.currentTime = 0;
        audio.play();
      }
    });
    prevInRangeIds.current = new Set(enemies.filter(e => e.inRange).map(e => e.id));
  }, [enemies, soundEnabled]);

  return (
    <>
      <Reticle
        hover={hoverTarget}
        pulse={lockStatus === 'locking' || lockStatus === 'locked'}
        hitMarker={hitMarker}
        lockStatus={lockStatus}
        lockProgress={lockProgress}
      />
      {enemies.map(enemy =>
        enemy.onScreen ? (
          <EnemyIndicator
            key={enemy.id}
            {...enemy}
            locked={lockedTargetId === enemy.id}
            lockStatus={lockedTargetId === enemy.id ? lockStatus : undefined}
            lockProgress={lockedTargetId === enemy.id ? lockProgress : undefined}
            onClick={() => onSetLockedTarget && onSetLockedTarget(enemy.id)}
          />
        ) : (
          <OffscreenArrow key={enemy.id} {...enemy} />
        )
      )}
    </>
  );
}


function Reticle({ hover, pulse, hitMarker, lockStatus, lockProgress }) {
  // SVG reticle, pulses when enemy in range, flashes on hit
  const [showHit, setShowHit] = useState(false);
  useEffect(() => {
    if (hitMarker) {
      setShowHit(true);
      const t = setTimeout(() => setShowHit(false), 250);
      return () => clearTimeout(t);
    }
  }, [hitMarker]);
  // Lock-on progress ring and status
  return (
    <svg className={`reticle${hover ? ' reticle-hover' : ''}${pulse ? ' reticle-pulse' : ''}${showHit ? ' reticle-hit' : ''}`} width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="22" stroke={hover ? '#ff0' : '#0ff'} strokeWidth="2.5" fill="none" />
      <circle cx="40" cy="40" r="6" stroke={hover ? '#ff0' : '#0ff'} strokeWidth="2.5" fill="none" />
      <line x1="40" y1="10" x2="40" y2="26" stroke={hover ? '#ff0' : '#0ff'} strokeWidth="2" />
      <line x1="40" y1="54" x2="40" y2="70" stroke={hover ? '#ff0' : '#0ff'} strokeWidth="2" />
      <line x1="10" y1="40" x2="26" y2="40" stroke={hover ? '#ff0' : '#0ff'} strokeWidth="2" />
      <line x1="54" y1="40" x2="70" y2="40" stroke={hover ? '#ff0' : '#0ff'} strokeWidth="2" />
      {showHit && <circle cx="40" cy="40" r="28" stroke="#fff" strokeWidth="4" fill="none" opacity="0.7" />}
      {/* Lock-on progress ring */}
      {lockStatus && lockStatus !== 'none' && (
        <circle
          cx="40"
          cy="40"
          r="28"
          stroke={lockStatus === 'locked' ? '#0f0' : '#ff0'}
          strokeWidth="3"
          fill="none"
          opacity={lockStatus === 'locked' ? 1 : 0.7}
          strokeDasharray={2 * Math.PI * 28}
          strokeDashoffset={2 * Math.PI * 28 * (1 - (lockProgress || 0))}
        />
      )}
      {/* Lock status text */}
      {lockStatus && lockStatus !== 'none' && (
        <text x="40" y="75" textAnchor="middle" fill={lockStatus === 'locked' ? '#0f0' : '#ff0'} fontSize="13" fontWeight="bold">
          {lockStatus === 'locked' ? 'LOCKED' : lockStatus === 'locking' ? 'LOCKING' : 'LOST'}
        </text>
      )}
    </svg>
  );
}


function EnemyIndicator({ screenX, screenY, distance, inRange, locked, lockStatus, lockProgress, onClick }) {
  // On-screen enemy: show a box with distance, animate lock-on
  return (
    <div
      className={`enemy-indicator${inRange ? ' in-range lockon-anim' : ''}${locked ? ' locked' : ''}`}
      style={{ left: screenX, top: screenY, borderColor: locked ? (lockStatus === 'locked' ? '#0f0' : '#ff0') : undefined }}
      onClick={onClick}
      title={locked ? (lockStatus === 'locked' ? 'LOCKED' : 'Locking...') : undefined}
    >
      <svg width="36" height="36" viewBox="0 0 36 36">
        <rect x="2" y="2" width="32" height="32" rx="7" stroke={locked ? (lockStatus === 'locked' ? '#0f0' : '#ff0') : '#f00'} strokeWidth="2.5" fill="none" />
      </svg>
      <span className="enemy-distance">{distance.toFixed(0)}m</span>
      {locked && lockStatus && (
        <span className="lock-status" style={{ color: lockStatus === 'locked' ? '#0f0' : '#ff0', fontWeight: 'bold', fontSize: '12px' }}>
          {lockStatus === 'locked' ? 'LOCKED' : 'LOCKING'}
        </span>
      )}
      {locked && typeof lockProgress === 'number' && lockStatus !== 'locked' && (
        <div className="lock-progress-bar" style={{ width: `${lockProgress * 100}%`, background: '#ff0', height: '3px', marginTop: '2px' }} />
      )}
    </div>
  );
}


function OffscreenArrow({ screenX, screenY, distance }) {
  // Defensive: if distance is not a valid number, skip rendering
  if (typeof distance !== 'number' || isNaN(distance)) return null;
  // Off-screen enemy: show an arrow at edge, wiggle animation
  return (
    <div className="offscreen-arrow wiggle-anim" style={{ left: screenX, top: screenY }}>
      <svg width="40" height="40" viewBox="0 0 40 40">
        <polygon points="20,2 38,38 2,38" fill="#f00" />
      </svg>
      <span className="enemy-distance">{distance.toFixed(0)}m</span>
    </div>
  );
}

