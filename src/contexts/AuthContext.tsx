import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "student";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isApproved: boolean | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshApproval: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      return data?.role as AppRole | null;
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  };

  const fetchApprovalStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching approval status:", error);
        return null;
      }

      return data?.is_approved ?? false;
    } catch (error) {
      console.error("Error fetching approval status:", error);
      return null;
    }
  };

  const refreshApproval = async () => {
    if (user) {
      const approved = await fetchApprovalStatus(user.id);
      setIsApproved(approved);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer role + approval fetch to avoid blocking
          setTimeout(async () => {
            const [userRole, approved] = await Promise.all([
              fetchUserRole(session.user.id),
              fetchApprovalStatus(session.user.id),
            ]);
            setRole(userRole);
            setIsApproved(approved);
          }, 0);
        } else {
          setRole(null);
          setIsApproved(null);
        }

        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        Promise.all([
          fetchUserRole(session.user.id),
          fetchApprovalStatus(session.user.id),
        ]).then(([userRole, approved]) => {
          setRole(userRole);
          setIsApproved(approved);
        });
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: AppRole) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setIsApproved(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isApproved,
        loading,
        signUp,
        signIn,
        signOut,
        refreshApproval,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
