import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type User = { id: string; name: string; email: string; role: string; organizationId?: string; branchId?: string };

type Auth = {
  user: User | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
};

const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("erp-user");
    if (saved) setUser(JSON.parse(saved));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata || {};
        const u: User = {
          id: session.user.id,
          name: meta.name || session.user.email || "",
          email: session.user.email || "",
          role: meta.role || "STAFF",
          organizationId: meta.organizationId || null,
          branchId: meta.branchId || null,
        };
        setUser(u);
        localStorage.setItem("erp-user", JSON.stringify(u));
      } else {
        setUser(null);
        localStorage.removeItem("erp-user");
      }
      setLoading(false);
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  const login = async (identifier: string, password: string) => {
    const email = identifier.includes("@") ? identifier : `${identifier}@pushpak.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  };

  return <Context.Provider value={{ user, login, logout, loading }}>{children}</Context.Provider>;
}

export const useAuth = () => {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider missing");
  return value;
};
