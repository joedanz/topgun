// src/controls/platformDetection.js
import { setupDesktopInput } from './desktopInput';
import { setupMobileTouchInput } from './mobileTouchInput';
import { setupMobileTiltInput } from './mobileTiltInput';
import { setupControllerInput } from './controllerInput';

/**
 * Detects platform/device and switches to the appropriate input scheme.
 * @param {InputAbstraction} input
 * @param {InputSettings} settings
 */
export function setupPlatformControls(input, settings) {
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const hasTouch = 'ontouchstart' in window;
  const hasGamepad = !!navigator.getGamepads;

  // Always support controller input if available
  if (hasGamepad) setupControllerInput(input);

  if (isMobile || hasTouch) {
    setupMobileTouchInput(input);
    // Optionally enable tilt if user prefers
    if (settings.get('tiltEnabled')) {
      setupMobileTiltInput(input);
      input.setState('enableTilt', true);
    }
  } else {
    setupDesktopInput(input);
  }
}

/**
 * Example usage:
 * setupPlatformControls(input, settings);
 */
