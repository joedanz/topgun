// src/ui/radar.js
/**
 * Mounts the radar/minimap overlay into the DOM.
 */
export function mountRadar() {
  if (!document.getElementById('hud-radar')) {
    fetch('src/ui/radar.html')
      .then(res => res.text())
      .then(html => {
        const div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div.firstElementChild);
      });
  }
  // Add CSS
  if (!document.getElementById('radar-css')) {
    const link = document.createElement('link');
    link.id = 'radar-css';
    link.rel = 'stylesheet';
    link.href = 'src/ui/radar.css';
    document.head.appendChild(link);
  }
}

/**
 * Updates the radar with player and enemy positions.
 * @param {Object} opts
 *   player: { x, z, heading }
 *   enemies: [{ x, z }, ...]
 *   range: number (max distance shown)
 */
export function updateRadar({ player, enemies, range = 400 }) {
  const canvas = document.getElementById('radar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width/2, cy = canvas.height/2, r = Math.min(cx, cy) - 4;

  // Draw radar circle
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.strokeStyle = '#00ffcc';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Draw player heading
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-player.heading);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -r + 6);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Draw enemies
  enemies.forEach(enemy => {
    // Translate enemy position relative to player
    const dx = enemy.x - player.x;
    const dz = enemy.z - player.z;
    // Rotate by -player.heading
    const angle = Math.atan2(dx, dz) - player.heading;
    const dist = Math.sqrt(dx*dx + dz*dz);
    if (dist > range) return; // Out of radar
    const er = (dist/range) * (r - 10);
    const ex = cx + Math.sin(angle) * er;
    const ey = cy - Math.cos(angle) * er;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ex, ey, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#ff3366';
    ctx.globalAlpha = 0.95;
    ctx.fill();
    ctx.restore();
  });
}
