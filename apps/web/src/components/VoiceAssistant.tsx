import React from 'react';
import { DesktopNeonOrb } from './DesktopNeonOrb';
import { useUIStore } from '../stores/uiStore';

export const VoiceAssistant: React.FC = () => {
  const showLegacyOrb = useUIStore((state) => state.showLegacyOrb);

  if (!showLegacyOrb) {
    return null;
  }

  return <DesktopNeonOrb />;
};
