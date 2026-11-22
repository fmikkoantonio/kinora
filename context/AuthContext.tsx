import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  startupError: string | null;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function requireSupabase() {
  if (!supabase) throw new Error("Supabase is not configured. Add the project URL and anon key to .env.");
  return supabase;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [startupError, setStartupError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setStartupError(error.message);
      else setSession(data.session);
      setLoading(false);
    }, (sessionError: unknown) => {
      if (!active) return;
      setStartupError(sessionError instanceof Error ? sessionError.message : "Could not restore the sign-in session.");
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    loading,
    startupError,
    configured: isSupabaseConfigured,
    signIn: async (email, password) => {
      const { error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    },
    signUp: async (name, email, password) => {
      const { data, error } = await requireSupabase().auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (error) throw error;
      return !data.session;
    },
    signOut: async () => {
      const { error } = await requireSupabase().auth.signOut();
      if (error) throw error;
    },
  }), [session, loading, startupError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function getUserDisplayName(user: User | null): string {
  const fullName = user?.user_metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  return user?.email ?? "Account owner";
}
