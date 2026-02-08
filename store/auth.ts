import { create } from 'zustand';
import { supabase } from '@/services/supabase';
import { TIERS, type TierConfig, type TierName } from '@/constants/tiers';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  tier: TierConfig;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tier: TIERS.free,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, tier')
          .eq('id', session.user.id)
          .single();

        const tierName = (profile?.tier as TierName) ?? 'free';

        set({
          user: {
            id: session.user.id,
            email: session.user.email ?? '',
            name: profile?.name ?? '',
          },
          tier: TIERS[tierName],
          isInitialized: true,
        });
      } else {
        set({ isInitialized: true });
      }
    } catch {
      set({ isInitialized: true });
    }

    // Listen for auth state changes (token refresh, sign out from another tab, etc.)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        set({ user: null, tier: TIERS.free });
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, tier')
          .eq('id', session.user.id)
          .single();

        const tierName = (profile?.tier as TierName) ?? 'free';

        set({
          user: {
            id: session.user.id,
            email: session.user.email ?? '',
            name: profile?.name ?? '',
          },
          tier: TIERS[tierName],
        });
      }
    });
  },

  signUp: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error('Sign up failed');

      // Update the auto-created profile with the user's name
      await supabase
        .from('profiles')
        .update({ name })
        .eq('id', data.user.id);

      set({
        user: { id: data.user.id, email, name },
        tier: TIERS.free,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, tier')
        .eq('id', data.user.id)
        .single();

      const tierName = (profile?.tier as TierName) ?? 'free';

      set({
        user: {
          id: data.user.id,
          email: data.user.email ?? '',
          name: profile?.name ?? '',
        },
        tier: TIERS[tierName],
      });
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, tier: TIERS.free });
  },
}));

/**
 * Get the current Supabase access token for API requests.
 */
export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
