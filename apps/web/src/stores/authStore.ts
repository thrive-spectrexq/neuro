import { create } from 'zustand';

interface AuthState {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('neuro_token'),
  setToken: (token: string | null) => {
    if (token) {
      localStorage.setItem('neuro_token', token);
    } else {
      localStorage.removeItem('neuro_token');
    }
    set({ token });
  },
  logout: () => {
    localStorage.removeItem('neuro_token');
    set({ token: null });
  },
}));
