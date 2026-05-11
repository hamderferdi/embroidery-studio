/**
 * authStore — global auth state backed by Supabase.
 * Initialises from the existing session on mount, then listens for
 * auth state changes (login, logout, token refresh).
 */
import { create } from 'zustand'
import { supabase, type SupabaseUser } from '../lib/supabase'

interface AuthState {
  user:          SupabaseUser | null
  loading:       boolean
  init:          () => Promise<void>
  signUp:        (email: string, password: string, displayName: string) => Promise<string | null>
  signIn:        (email: string, password: string) => Promise<string | null>
  signOut:          () => Promise<void>
  signInWithGoogle: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user:    null,
  loading: true,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({ user: session?.user ?? null, loading: false })

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null })
    })
  },

  signUp: async (email, password, displayName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    return error?.message ?? null
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },

  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
  },
}))
