import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface AuthState {
  isReady: boolean;
  token: string | null;
  setIsReady: (isReady: boolean) => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        isReady: false,
        token: null,
        setIsReady: (isReady) => set({ isReady }),
        setToken: (token) => set({ token }),
      }),
      {
        name: 'auth',
        partialize: (state) => ({ token: state.token }),
      },
    ),
  ),
);
