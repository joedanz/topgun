import React, { useEffect } from 'react';
import './PauseMenu.css';

/**
 * PauseMenu
 * @param {boolean} open - Whether the pause menu is open
 * @param {function} onResume - Callback for resume
 * @param {function} onRestart - Callback for restart
 * @param {function} onSettings - Callback for settings
 * @param {function} onQuit - Callback for quit
 */
export function PauseMenu({ open, onResume, onRestart, onSettings, onQuit }) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === 'Escape') onResume && onResume();
      if (e.key === 'ArrowDown' || e.key === 'Tab') {
        e.preventDefault();
        moveFocus(1);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveFocus(-1);
      }
      if (e.key === 'Enter' || e.key === ' ') {
        document.activeElement && document.activeElement.click && document.activeElement.click();
      }
    }
    function moveFocus(dir) {
      const items = Array.from(document.querySelectorAll('.pause-menu button'));
      const idx = items.indexOf(document.activeElement);
      let next = (idx + dir + items.length) % items.length;
      items[next].focus();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onResume]);

  if (!open) return null;
  return (
    <div className="pause-menu-overlay">
      <div className="pause-menu">
        <div className="pause-title">Game Paused</div>
        <button autoFocus className="pause-btn" onClick={onResume}>Resume</button>
        <button className="pause-btn" onClick={onRestart}>Restart Mission</button>
        <button className="pause-btn" onClick={() => { onSettings && onSettings(); }}>Settings</button>
        <button className="pause-btn" onClick={onQuit}>Quit Game</button>
      </div>
    </div>
  );
}
