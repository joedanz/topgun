// src/components/HUDOverlayEffects.js
import React, { useEffect, useState } from 'react';
import ScreenFlash from './ScreenFlash';

/**
 * HUDOverlayEffects
 * Shows feedback overlays (flash, shake trigger) when player takes damage.
 * @param {boolean} damageTrigger - Set to true to trigger effects
 * @param {function} onShake - Called to trigger camera shake
 */
export default function HUDOverlayEffects({ damageTrigger, onShake }) {
  useEffect(() => {
    if (damageTrigger && typeof onShake === 'function') {
      onShake();
    }
  }, [damageTrigger, onShake]);
  return <ScreenFlash trigger={damageTrigger} />;
}
