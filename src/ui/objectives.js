// src/ui/objectives.js
/**
 * Mounts the mission objective HUD overlay.
 */
export function mountObjectives() {
  if (!document.getElementById('hud-objectives')) {
    fetch('src/ui/objectives.html')
      .then(res => res.text())
      .then(html => {
        const div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div.firstElementChild);
      });
  }
  // Add CSS
  if (!document.getElementById('objectives-css')) {
    const link = document.createElement('link');
    link.id = 'objectives-css';
    link.rel = 'stylesheet';
    link.href = 'src/ui/objectives.css';
    document.head.appendChild(link);
  }
}

/**
 * Updates the mission objective text.
 * @param {string} text
 */
export function updateObjective(text) {
  const el = document.getElementById('objective-text');
  if (el) el.textContent = text;
}

// --- 3D Waypoint Indicator ---
import * as THREE from 'three';

/**
 * Adds a 3D waypoint indicator to the scene at the given world position.
 * Returns the mesh for further updates/removal.
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3} position
 */
export function addWaypointIndicator(scene, position) {
  const geometry = new THREE.TorusGeometry(8, 1.2, 16, 100);
  const material = new THREE.MeshBasicMaterial({ color: 0xffee00 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.x = Math.PI / 2;
  scene.add(mesh);
  return mesh;
}

/**
 * Optionally, you can animate or remove the waypoint indicator as needed.
 */
