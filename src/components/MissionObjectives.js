import React, { useState } from 'react';
import './MissionObjectives.css';

/**
 * MissionObjectives
 * Collapsible panel for current and completed mission objectives.
 * @param {object[]} objectives - Array of { id, text, completed }
 */
export function MissionObjectives({ objectives = [] }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`mission-objectives${collapsed ? ' collapsed' : ''}`}> 
      <div className="mo-header" onClick={() => setCollapsed(c => !c)}>
        <span className="mo-title">Mission Objectives</span>
        <span className="mo-toggle">{collapsed ? '+' : '\u25B2'}</span>
      </div>
      {!collapsed && (
        <ul className="mo-list">
          {objectives.map(obj => (
            <li key={obj.id} className={obj.completed ? 'completed' : ''}>
              <span className="mo-dot" />
              <span className="mo-text">{obj.text}</span>
              {obj.completed && <span className="mo-check">✔</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * NotificationSystem
 * Shows temporary notifications, animates in/out, with a queue.
 * @param {string[]} notifications - Array of notification strings
 */
export function NotificationSystem({ notifications = [] }) {
  return (
    <div className="notification-system">
      {notifications.map((msg, i) => (
        <div className="notification" key={i}>{msg}</div>
      ))}
    </div>
  );
}
