import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.ts';
import { Role } from '../types/index.ts';
import { normalizeRole } from '../config/navigation.ts';
import { clearAllDataStores } from '../data/repo.ts';

export interface ProfileRecord {
  id: string;
  role: Role;
  display_name: string;
  is_active?: boolean;
  client_id?: string;
  partner_id?: string;
  target_entity_id?: string;
  [key: string]: any;
}

export interface AuthContextType {
  isConfigured: boolean;
  isSupabaseAuth: boolean;
  user: SupabaseUser | null;
  profile: ProfileRecord | null;
  loading: boolean;
  error: string | null;
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  sendPasswordResetEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isConfigured: false,
  isSupabaseAuth: false,
  user: null,
  profile: null,
  loading: false,
  error: null,
  signInWithPassword: async () => ({ success: false, error: 'Not configured' }),
  sendPasswordResetEmail: async () => ({ success: false, error: 'Not configured' }),
  signOut: async () => {},
  clearError: () => {},
});

// Map database roles to app Role types
export function mapDbRoleToAppRole(rawRole: string | undefined): Role {
  return normalizeRole(rawRole);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (userId: string): Promise<ProfileRecord | null> => {
    if (!supabase) return null;
    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) {
        throw new Error(profileErr.message);
      }

      if (!data) {
        // "If there is no active profile row, show 'No access' and sign out."
        return null;
      }

      // Check active flag if present in profile
      if (data.is_active === false) {
        return null;
      }

      return {
        id: data.id,
        display_name: data.display_name || data.full_name || data.email || 'User',
        ...data,
        role: normalizeRole(data.role),
      };
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      if (initialSession?.user) {
        try {
          const prof = await fetchProfile(initialSession.user.id);
          if (!prof) {
            // No active profile row or inactive
            await supabase?.auth.signOut();
            clearAllDataStores();
            if (isMounted) {
              setSession(null);
              setUser(null);
              setProfile(null);
              setError('No access: Your account does not have an active profile or has been deactivated.');
            }
          } else {
            if (isMounted) {
              setSession(initialSession);
              setUser(initialSession.user);
              setProfile(prof);
            }
          }
        } catch (err: any) {
          if (isMounted) {
            setError(err.message || 'Failed to retrieve user profile.');
          }
        }
      }
      if (isMounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      if (newSession?.user) {
        try {
          const prof = await fetchProfile(newSession.user.id);
          if (!prof) {
            await supabase?.auth.signOut();
            clearAllDataStores();
            if (isMounted) {
              setSession(null);
              setUser(null);
              setProfile(null);
              setError('No access: Your account does not have an active profile or has been deactivated.');
            }
          } else {
            if (isMounted) {
              setSession(newSession);
              setUser(newSession.user);
              setProfile(prof);
              setError(null);
            }
          }
        } catch (err: any) {
          if (isMounted) {
            setError(err.message || 'Failed to retrieve profile.');
          }
        }
      } else {
        if (isMounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured (missing environment variables).' };
    }
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        return { success: false, error: authError.message };
      }

      if (data.user) {
        const prof = await fetchProfile(data.user.id);
        if (!prof) {
          await supabase.auth.signOut();
          clearAllDataStores();
          const noAccessErr = 'No access: Your account does not have an active profile or has been deactivated.';
          setError(noAccessErr);
          return { success: false, error: noAccessErr };
        }
        setUser(data.user);
        setProfile(prof);
        return { success: true };
      }

      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Login failed.';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured.' };
    }
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (resetErr) {
        return { success: false, error: resetErr.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Password reset request failed.' };
    }
  };

  const signOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Error during Supabase signOut:', err);
    }

    // Clear all in-memory data stores and localStorage keys
    clearAllDataStores();

    setUser(null);
    setProfile(null);
    setSession(null);
    setError(null);
  };

  const clearError = () => setError(null);

  const isSupabaseAuth = Boolean(user && profile);

  const value = useMemo(
    () => ({
      isConfigured: isSupabaseConfigured,
      isSupabaseAuth,
      user,
      profile,
      loading,
      error,
      signInWithPassword,
      sendPasswordResetEmail,
      signOut,
      clearError,
    }),
    [isSupabaseAuth, user, profile, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
