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
        // A missing table (fresh Supabase project without migrations applied)
        // surfaces here as a PostgREST error. Log it explicitly so the failing
        // step is visible instead of silently treating the user as non-admin.
        console.error(
          "[auth] checkAdminRole query failed:",
          error.message,
          error.code ? `(code ${error.code})` : "",
          '— a \'relation "user_roles" does not exist\' / PGRST205 error here means the' +
            " fresh Supabase project is missing the user_roles table (apply supabase/migrations).",
        );
        return false;
      }

      console.info("[auth] checkAdminRole →", data ? "admin" : "not admin");
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
    // UI depends on the auth result. Anonymous visitors (no Supabase auth cookie) make
    // up ~all public/SEO traffic. For them we skip loading the Supabase client entirely.
    const hasSessionCookie =
      typeof document !== "undefined" && /sb-[a-z0-9]+-auth-token/i.test(document.cookie);
    if (!hasSessionCookie) {
      console.info("[auth] no session cookie → anonymous visitor, skipping Supabase init");
      setIsLoading(false);
      return;
    }

    console.info("[auth] session cookie detected → initialising Supabase auth");

    let subscription: { unsubscribe: () => void } | undefined;
    let cancelled = false;
    let settled = false;
    let failSafeId: number | undefined;

    // Single, idempotent place that clears the loading state so the normal path
    // and the timeout below can never fight each other or double-fire.
    const finish = (reason: string) => {
      if (settled || cancelled) return;
      settled = true;
      if (failSafeId !== undefined) window.clearTimeout(failSafeId);
      console.info(`[auth] init complete (${reason}) → isLoading=false`);
      setIsLoading(false);
    };

    // Hard safety net — the spinner must NEVER be permanent. If getSession() or the
    // role check rejects or hangs (a stale session from a PREVIOUS Supabase project
    // after the env/keys changed, an unreachable NEXT_PUBLIC_SUPABASE_URL, or a
    // navigator-locks auth deadlock), force loading off so the login form still
    // renders and the admin can sign in fresh. This is the direct fix for the
    // "stuck spinner, no console error" symptom.
    failSafeId = window.setTimeout(() => {
      console.warn(
        "[auth] init did not settle within 8s — forcing the login UI to render. " +
          "Most likely a stale session from a previous Supabase project (env/keys changed) " +
          "or an unreachable NEXT_PUBLIC_SUPABASE_URL. Signing in again establishes a fresh session.",
      );
      finish("timeout");
    }, 8000);

    const init = async () => {
      try {
        const supabase = await getSupabase();
        if (cancelled) return;

        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          console.info(`[auth] onAuthStateChange: ${event}`);
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            // Defer DB work out of the callback: supabase-js holds an auth lock for
            // the duration of this callback, and awaiting another Supabase call
            // inside it deadlocks. setTimeout(0) runs it after the lock releases.
            setTimeout(() => {
              checkAdminRole(session.user.id).then(setIsAdmin);
            }, 0);
          } else {
            setIsAdmin(false);
          }
        });
        subscription = data.subscription;

        console.info("[auth] calling getSession()…");
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;

        if (sessionError) {
          console.error("[auth] getSession() returned an error:", sessionError.message);
          finish("getSession error");
          return;
        }

        const session = sessionData.session;
        setSession(session);
        setUser(session?.user ?? null);
        console.info(`[auth] getSession() ok → session ${session ? "present" : "null"}`);

        if (session?.user) {
          const admin = await checkAdminRole(session.user.id);
          if (cancelled) return;
          setIsAdmin(admin);
        }
        finish("ok");
      } catch (err) {
        // getSession()/refresh threw (network/CSP/lock). Never leave the spinner up.
        console.error("[auth] init threw — rendering login form anyway:", err);
        finish("init threw");
      }
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
      if (failSafeId !== undefined) window.clearTimeout(failSafeId);
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
