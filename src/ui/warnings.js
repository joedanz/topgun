// src/ui/warnings.js
/**
 * Mounts the damage/warning overlay into the DOM.
 */
export function mountWarnings() {
  if (!document.getElementById('hud-warnings')) {
    fetch('src/ui/warnings.html')
      .then(res => res.text())
      .then(html => {
        const div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div.firstElementChild);
      });
  }
  // Add CSS
  if (!document.getElementById('warnings-css')) {
    const link = document.createElement('link');
    link.id = 'warnings-css';
    link.rel = 'stylesheet';
    link.href = 'src/ui/warnings.css';
    document.head.appendChild(link);
  }
}

/**
 * Flashes the screen red for brief damage feedback.
 */
export function showDamageFlash() {
  const flash = document.getElementById('damage-flash');
  if (!flash) return;
  flash.style.opacity = '1';
  setTimeout(() => { flash.style.opacity = '0'; }, 180);
}

/**
 * Shows a warning icon for a critical state (e.g., 'LOW HEALTH', 'MISSILE LOCK').
 * @param {string} text
 * @param {number} [duration=1200] ms
 */
export function showWarningIcon(text, duration = 1200) {
  const icons = document.getElementById('warning-icons');
  if (!icons) return;
  const icon = document.createElement('div');
  icon.className = 'warning-icon';
  icon.textContent = text;
  icons.appendChild(icon);
  setTimeout(() => icon.remove(), duration);
}
