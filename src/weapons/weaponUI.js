// src/weapons/weaponUI.js
/**
 * Simple UI for weapon switching and showing current weapon/ammo.
 * Integrate with your HUD as needed.
 */
export function mountWeaponUI(weapons) {
  if (document.getElementById('weapon-ui')) return;
  const div = document.createElement('div');
  div.id = 'weapon-ui';
  div.style.position = 'fixed';
  div.style.bottom = '2vw';
  div.style.left = '50%';
  div.style.transform = 'translateX(-50%)';
  div.style.zIndex = '2100';
  div.style.background = 'rgba(0,0,0,0.6)';
  div.style.borderRadius = '1vw';
  div.style.padding = '0.7vw 2vw';
  div.style.color = '#fff';
  div.style.fontFamily = "'Orbitron', 'Consolas', monospace";
  div.style.fontSize = '2vw';
  div.style.display = 'flex';
  div.style.gap = '2vw';
  div.style.pointerEvents = 'auto';
  weapons.forEach((w, i) => {
    const btn = document.createElement('button');
    btn.textContent = w.name + ` (${w.ammo})`;
    btn.style.background = '#222';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.borderRadius = '0.5vw';
    btn.style.padding = '0.5vw 1.2vw';
    btn.style.fontSize = '1.6vw';
    btn.style.cursor = 'pointer';
    btn.onclick = () => window.dispatchEvent(new CustomEvent('weaponSwitch', { detail: i }));
    div.appendChild(btn);
  });
  document.body.appendChild(div);
}

/**
 * Updates the weapon UI to reflect current weapon/ammo.
 */
export function updateWeaponUI(weapons, activeIndex) {
  const div = document.getElementById('weapon-ui');
  if (!div) return;
  Array.from(div.children).forEach((btn, i) => {
    btn.textContent = weapons[i].name + ` (${weapons[i].ammo})`;
    btn.style.background = (i === activeIndex) ? '#00ffcc' : '#222';
    btn.style.color = (i === activeIndex) ? '#222' : '#fff';
  });
}

/**
 * Call this in your game loop or after firing/switching weapons to keep UI in sync.
 */

// --- Impact Effects ---
import { createExplosion } from './weaponEffects';

/**
 * Triggers an impact effect at the given position for the specified weapon type.
 */
export function showImpactEffect(scene, position, type) {
  if (type === 'missile' || type === 'bomb') {
    createExplosion(scene, position);
  } else if (type === 'bullet') {
    // Optionally: add bullet hit spark
    createExplosion(scene, position); // Placeholder for spark effect
  }
}
