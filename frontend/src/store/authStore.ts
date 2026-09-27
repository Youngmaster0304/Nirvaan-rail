import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, setUnauthorizedHandler, apiErrorMessage } from '../services/api';
import type { User } from '../services/types';

const TOKEN_KEY = 'auth-token';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  /** true until the persisted session has been validated on first mount */
  bootstrapped: boolean;
  login: (employee_id: string, password: string) => Promise<void>;
  logout: () => void;
  /** Validate the persisted token against GET /api/auth/me */
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      bootstrapped: false,

      login: async (employee_id, password) => {
        const res = await api.auth.login(employee_id, password);
        localStorage.setItem(TOKEN_KEY, res.access_token);
        set({ user: res.user, token: res.access_token, isAuthenticated: true, bootstrapped: true });
      },

      logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        set({ user: null, token: null, isAuthenticated: false, bootstrapped: true });
      },

      checkAuth: async () => {
        const token = get().token ?? localStorage.getItem(TOKEN_KEY);
        if (!token) {
          set({ bootstrapped: true, isAuthenticated: false });
          return;
        }
        try {
          const user = await api.auth.me();
          set({ user, token, isAuthenticated: true, bootstrapped: true });
        } catch (error) {
          // 401 is handled globally; any other failure still ends the session
          // because we cannot verify who the caller is.
          if (apiErrorMessage(error).includes('unreachable')) {
            // Backend not running: keep the local session so the shell still
            // renders, and let individual pages surface their own errors.
            set({ isAuthenticated: true, bootstrapped: true });
            return;
          }
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      // Persist the session so a refresh does not log the dispatcher out.
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);

// Global 401 -> drop the session in the store as well as localStorage.
setUnauthorizedHandler(() => {
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false, bootstrapped: true });
});
