// src/ui/hud.js
/**
 * Updates the HUD overlay with current game stats.
 * Call this in your main render/game loop.
 */
export function updateHUD({ speed = 0, altitude = 0, ammo = 0, health = 100 }) {
  const speedEl = document.getElementById('hud-speed');
  const altEl = document.getElementById('hud-altitude');
  const ammoEl = document.getElementById('hud-ammo');
  const hpEl = document.getElementById('hud-health');
  if (speedEl) speedEl.textContent = speed.toString().padStart(3, '0');
  if (altEl) altEl.textContent = altitude.toString().padStart(4, '0');
  if (ammoEl) ammoEl.textContent = ammo;
  if (hpEl) hpEl.textContent = health;
}

/**
 * Call this once on game start to inject the HUD overlay into the DOM.
 */
export function mountHUD() {
  if (!document.getElementById('hud-overlay')) {
    fetch('src/ui/hud.html')
      .then(res => res.text())
      .then(html => {
        const div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div.firstElementChild);
      });
  }
  // Add CSS
  if (!document.getElementById('hud-css')) {
    const link = document.createElement('link');
    link.id = 'hud-css';
    link.rel = 'stylesheet';
    link.href = 'src/ui/hud.css';
    document.head.appendChild(link);
  }
}
