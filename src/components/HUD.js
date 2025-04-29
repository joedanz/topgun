// src/components/HUD.js
// Main HUD container and core flight info components
import React, { useState, useEffect } from 'react';
import './HUD.css';

export function HUD({ speed = 0, altitude = 0, currentWeapon = null, weapons = [], health = 100 }) {
  return (
    <div className="hud-container">
      <SpeedDisplay speed={speed} />
      <AltitudeDisplay altitude={altitude} />
      <div>
        <WeaponDisplay currentWeapon={currentWeapon} weapons={weapons} />
        {/* Show heat bar if weapon has heat system */}
        {currentWeapon && currentWeapon.maxHeat > 0 && (
          <HeatBar
            heat={currentWeapon.heat}
            maxHeat={currentWeapon.maxHeat}
            overheated={currentWeapon.overheated}
          />
        )}
      </div>
      <HealthBar health={health} />
    </div>
  );
}

function HeatBar({ heat, maxHeat, overheated }) {
  const percent = Math.min(1, heat / maxHeat);
  let color = '#33c3ff'; // cool = blue
  if (percent > 0.7 && !overheated) color = '#ff9f1c'; // hot = orange
  if (overheated) color = '#ff2e2e'; // overheated = red
  return (
    <div className={`hud-heat-bar hud-block${overheated ? ' overheated' : ''}`}
         title={overheated ? 'OVERHEATED' : `Heat: ${(percent*100).toFixed(0)}%`}>
      <span className="hud-label">HEAT</span>
      <div className="hud-heat-fill" style={{ width: `${percent*100}%`, background: color, boxShadow: overheated ? '0 0 8px 2px #ff2e2e' : undefined }} />
    </div>
  );
}

function SpeedDisplay({ speed }) {
  const [prev, setPrev] = useState(speed);
  useEffect(() => { setPrev(speed); }, [speed]);
  return (
    <div className="hud-speed hud-block">
      <span className="hud-label">SPD</span>
      <span className="hud-value">{speed.toFixed(0)}
        <span className="hud-unit">kn</span>
      </span>
    </div>
  );
}

function AltitudeDisplay({ altitude }) {
  return (
    <div className="hud-altitude hud-block">
      <span className="hud-label">ALT</span>
      <span className="hud-value">{altitude.toFixed(0)}
        <span className="hud-unit">ft</span>
      </span>
    </div>
  );
}

function WeaponDisplay({ currentWeapon, weapons }) {
  if (!currentWeapon) return null;
  // Icon and color based on weapon type
  const icons = {
    'Machine Gun': '🔫',
    'Cannon': '💥',
    'Missile': '🚀',
    'Rocket Pod': '🎇',
  };
  const icon = icons[currentWeapon.name] || '🔫';
  return (
    <div className="hud-weapon hud-block">
      <span className="hud-label">WEAPON</span>
      <span role="img" aria-label={currentWeapon.name} className="hud-icon">{icon}</span>
      <span className="hud-weapon-name">{currentWeapon.name}</span>
      <span className="hud-value">{currentWeapon.ammoCount}</span>
      {/* Optionally show all weapons */}
      {weapons.length > 1 && (
        <span className="hud-weapon-list">
          {weapons.map((w, i) => (
            <span key={i} className={w === currentWeapon ? 'selected' : ''}>
              {icons[w.name] || '🔫'}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

function HealthBar({ health }) {
  // Green to red gradient
  const color = `linear-gradient(90deg, #0f0 ${(health)}%, #ff0 ${(100-health)/2+health}%, #f00 100%)`;
  return (
    <div className="hud-health hud-block">
      <span className="hud-label">HP</span>
      <div className="hud-health-bar" style={{ background: color }}>
        <div className="hud-health-fill" style={{ width: `${health}%` }} />
      </div>
      <span className="hud-value">{health}</span>
    </div>
  );
}
