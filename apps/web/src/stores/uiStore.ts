import { create } from 'zustand';

export type ActiveTab = 'graph' | 'canvas' | 'tasks' | 'study' | 'diagnostics' | 'automations' | 'audit';

interface UIState {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isAssistantOpen: boolean;
  toggleAssistant: () => void;
  setAssistantOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  showImportHub: boolean;
  setShowImportHub: (show: boolean) => void;
  showWebClipper: boolean;
  setShowWebClipper: (show: boolean) => void;
  showLegacyOrb: boolean;
  setShowLegacyOrb: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'graph',
  setActiveTab: (tab) => set({ activeTab: tab }),
  isAssistantOpen: false,
  toggleAssistant: () => set((state) => ({ isAssistantOpen: !state.isAssistantOpen })),
  setAssistantOpen: (open) => set({ isAssistantOpen: open }),
  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  showImportHub: false,
  setShowImportHub: (show) => set({ showImportHub: show }),
  showWebClipper: false,
  setShowWebClipper: (show) => set({ showWebClipper: show }),
  showLegacyOrb: localStorage.getItem('neuro_show_legacy_orb') === 'true',
  setShowLegacyOrb: (show) => {
    localStorage.setItem('neuro_show_legacy_orb', String(show));
    set({ showLegacyOrb: show });
  },
}));
