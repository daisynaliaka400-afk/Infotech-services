import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';

interface AdminUser {
  id: string;
  username: string;
  display_name: string | null;
}

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'infotech_admin_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch (_) {}
    setLoading(false);
  }, []);

  const signIn = async (username: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { username: username.trim(), password },
        method: 'POST',
      });

      if (error) {
        const msg = await error?.context?.text?.().catch(() => null);
        return { error: msg || error.message || 'Authentication failed' };
      }

      if (!data?.success || !data?.admin) {
        return { error: data?.error || 'Invalid username or password' };
      }

      const adminUser: AdminUser = {
        id: data.admin.id,
        username: data.admin.username,
        display_name: data.admin.display_name ?? null,
      };
      setUser(adminUser);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));
      return { error: null };
    } catch (e) {
      return { error: 'Unexpected error. Please try again.' };
    }
  };

  const signOut = async () => {
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

