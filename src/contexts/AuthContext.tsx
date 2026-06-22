"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";

// Load the Supabase client lazily. Auth setup is already deferred to browser idle
// and the auth methods run on user action, so importing on demand keeps Supabase's
// (~heavy) bundle off the initial JS-execution path on every page.
const getSupabase = () =>
  import("@/integrations/supabase/client").then((m) => m.supabase);

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminRole = async (userId: string) => {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Error checking admin role:", error);
        return false;
      }

      return !!data;
    } catch (err) {
      console.error("Error in checkAdminRole:", err);
      return false;
    }
  };

  useEffect(() => {
    // Defer Supabase auth setup to browser idle. Initializing the auth client +
    // running getSession() during hydration adds significant main-thread JS to the
    // critical path on every page (hurting Time to Interactive), yet no above-the-fold
    // UI depends on the auth result. Static/public pages render immediately; auth
    // resolves right after the page is interactive. Components already render a
    // loading state while isLoading is true.
    // Anonymous visitors (no Supabase auth cookie) make up ~all public/SEO
    // traffic. For them we skip loading the Supabase client entirely — no auth
    // request, no client bundle fetch on first load. Auth initialises normally
    // the moment a session cookie exists (after login).
    const hasSessionCookie =
      typeof document !== "undefined" && /sb-[a-z0-9]+-auth-token/i.test(document.cookie);
    if (!hasSessionCookie) {
      setIsLoading(false);
      return;
    }

    let subscription: { unsubscribe: () => void } | undefined;
    let cancelled = false;

    const init = async () => {
      const supabase = await getSupabase();
      if (cancelled) return;
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id).then(setIsAdmin);
          }, 0);
        } else {
          setIsAdmin(false);
        }
      });
      subscription = data.subscription;

      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          checkAdminRole(session.user.id).then((result) => {
            setIsAdmin(result);
            setIsLoading(false);
          });
        } else {
          setIsLoading(false);
        }
      });
    };

    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    let idleId: number | undefined;
    let timeoutId: number | undefined;
    if (ric) idleId = ric(init, { timeout: 2000 });
    else timeoutId = window.setTimeout(init, 800);

    return () => {
      cancelled = true;
      if (idleId !== undefined) (window as any).cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");

    const supabase = await getSupabase();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/`,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin,
        isLoading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
