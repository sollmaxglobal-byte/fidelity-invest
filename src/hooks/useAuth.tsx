import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkSuspended(uid: string) {
      const { data } = await supabase
        .from("profiles")
        .select("is_suspended")
        .eq("id", uid)
        .maybeSingle();
      if ((data as { is_suspended?: boolean } | null)?.is_suspended) {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") {
          alert("Your account has been suspended. Please contact support.");
        }
        return true;
      }
      return false;
    }

    let active = true;

    const loadUserState = async (s: Session | null) => {
      if (!active) return;
      setSession(s);
      setUser(s?.user ?? null);
      setIsAdmin(false);

      if (s?.user) {
        if (await checkSuspended(s.user.id)) return;
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", s.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (active) setIsAdmin(!!data);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      void loadUserState(s);
    });

    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      void loadUserState(s).finally(() => {
        if (active) setLoading(false);
      });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };

  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
