import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { permissions } from "../lib/permissions";
import type { ApprovalStatus, Profile, UserRole } from "../types/database";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  emailVerified: boolean;
  isApproved: boolean;
  role: UserRole | null;
  approvalStatus: ApprovalStatus | null;
  refreshProfile: () => Promise<{ profile: Profile | null; errorMessage: string | null }>;
  signOut: () => Promise<void>;
  can: typeof permissions;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<{
  profile: Profile | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile:", error.message);
    if (error.code === "PGRST205") {
      return {
        profile: null,
        errorMessage:
          "The profiles table is missing in Supabase. Open SQL Editor and run supabase/FIX_ROCHELLE_PROFILE.sql, then try again.",
      };
    }
    if (error.code === "42501" || /permission denied/i.test(error.message)) {
      return {
        profile: null,
        errorMessage:
          "Permission denied on profiles. Open SQL Editor and run supabase/GRANT_PROFILES_ACCESS.sql, then try again.",
      };
    }
    return { profile: null, errorMessage: error.message };
  }

  if (!data) {
    return {
      profile: null,
      errorMessage:
        "No profile row found for this account. Run the setup SQL (or ask an Admin to create your profile).",
    };
  }

  const row = data as Profile;
  return {
    profile: {
      ...row,
      approved_at: row.approved_at ?? null,
      approved_by: row.approved_by ?? null,
    },
    errorMessage: null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileUserIdRef = useRef<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      setProfile(null);
      profileUserIdRef.current = null;
      return { profile: null, errorMessage: "Not signed in." };
    }
    const result = await fetchProfile(userId);
    setProfile(result.profile);
    profileUserIdRef.current = result.profile?.id ?? null;
    return result;
  }, []);

  useEffect(() => {
    let mounted = true;
    let resolveSeq = 0;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    async function applySession(nextSession: Session | null) {
      const seq = ++resolveSeq;
      if (!mounted) return;

      setSession(nextSession);

      if (!nextSession?.user) {
        setProfile(null);
        profileUserIdRef.current = null;
        if (mounted && seq === resolveSeq) setLoading(false);
        return;
      }

      const userId = nextSession.user.id;
      // Same user already loaded — refresh quietly (no Loading screen flash on refresh).
      const alreadyReady = profileUserIdRef.current === userId;
      if (!alreadyReady) setLoading(true);

      const result = await fetchProfile(userId);
      if (!mounted || seq !== resolveSeq) return;

      setProfile(result.profile);
      profileUserIdRef.current = result.profile?.id ?? null;
      setLoading(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // getSession() below handles the first paint; skip duplicate INITIAL_SESSION flash.
      if (event === "INITIAL_SESSION") return;
      void applySession(nextSession);
    });

    void supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    profileUserIdRef.current = null;
    setSession(null);
  }, []);

  const user = session?.user ?? null;
  const emailVerified = Boolean(user?.email_confirmed_at);
  const role = profile?.role ?? null;
  const approvalStatus = profile?.approval_status ?? null;
  const isApproved = approvalStatus === "approved" && Boolean(role);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      emailVerified,
      isApproved,
      role,
      approvalStatus,
      refreshProfile,
      signOut,
      can: permissions,
    }),
    [
      session,
      user,
      profile,
      loading,
      emailVerified,
      isApproved,
      role,
      approvalStatus,
      refreshProfile,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
