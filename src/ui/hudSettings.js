// src/ui/hudSettings.js
/**
 * Mounts the HUD settings panel and applies user preferences.
 */
export function mountHUDSettings() {
  if (!document.getElementById('hud-settings')) {
    fetch('src/ui/hudSettings.html')
      .then(res => res.text())
      .then(html => {
        const div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div.firstElementChild);
        setupHUDSettings();
      });
  } else {
    setupHUDSettings();
  }
  // Add CSS
  if (!document.getElementById('hud-settings-css')) {
    const link = document.createElement('link');
    link.id = 'hud-settings-css';
    link.rel = 'stylesheet';
    link.href = 'src/ui/hudSettings.css';
    document.head.appendChild(link);
  }
}

function setupHUDSettings() {
  const opacitySlider = document.getElementById('hud-opacity-slider');
  const sizeSlider = document.getElementById('hud-size-slider');
  const hudOverlay = document.getElementById('hud-overlay');
  const radar = document.getElementById('hud-radar');
  const objectives = document.getElementById('hud-objectives');
  // Load from localStorage
  const opacity = parseFloat(localStorage.getItem('hudOpacity') || '0.85');
  const size = parseFloat(localStorage.getItem('hudSize') || '1');
  if (opacitySlider) opacitySlider.value = opacity;
  if (sizeSlider) sizeSlider.value = size;
  applyHUDSettings(opacity, size);

  if (opacitySlider) opacitySlider.oninput = (e) => {
    const val = parseFloat(e.target.value);
    localStorage.setItem('hudOpacity', val);
    applyHUDSettings(val, sizeSlider ? parseFloat(sizeSlider.value) : 1);
  };
  if (sizeSlider) sizeSlider.oninput = (e) => {
    const val = parseFloat(e.target.value);
    localStorage.setItem('hudSize', val);
    applyHUDSettings(opacitySlider ? parseFloat(opacitySlider.value) : 0.85, val);
  };
}

function applyHUDSettings(opacity, size) {
  const huds = [document.getElementById('hud-overlay'), document.getElementById('hud-radar'), document.getElementById('hud-objectives')];
  huds.forEach(el => {
    if (el) {
      el.style.opacity = opacity;
      el.style.transform = `scale(${size})`;
      el.style.transition = 'opacity 0.2s, transform 0.2s';
    }
  });
}
