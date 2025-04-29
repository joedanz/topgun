// src/components/ScreenFlash.js
import React, { useEffect, useState } from 'react';
import './ScreenFlash.css';

/**
 * ScreenFlash - full screen flash effect for damage feedback
 * @param {boolean} trigger - When true, flashes the screen
 */
export default function ScreenFlash({ trigger }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (trigger) {
      setShow(true);
      const t = setTimeout(() => setShow(false), 200);
      return () => clearTimeout(t);
    }
  }, [trigger]);
  return show ? <div className="screen-flash" /> : null;
}
