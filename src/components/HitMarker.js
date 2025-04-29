// HitMarker.js
// HUD overlay for successful hits (classic FPS "X" marker)
import React, { useEffect, useState } from 'react';
import './HitMarker.css';

/**
 * HitMarker HUD overlay
 * @param {boolean} trigger - When true, briefly shows the hit marker
 */
export default function HitMarker({ trigger }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (trigger) {
      setShow(true);
      // Play hit marker sound
      const audio = new Audio('/sounds/hit_marker.mp3');
      audio.volume = 0.7;
      audio.play();
      const t = setTimeout(() => setShow(false), 130);
      return () => clearTimeout(t);
    }
  }, [trigger]);
  return show ? (
    <div className="hit-marker-overlay">
      <div className="hit-marker-x" />
    </div>
  ) : null;
}
