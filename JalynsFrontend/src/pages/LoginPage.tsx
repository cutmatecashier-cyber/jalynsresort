import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { PasswordField } from "../components/PasswordField";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from =
    (location.state as { from?: string } | null)?.from &&
    (location.state as { from: string }).from !== "/login"
      ? (location.state as { from: string }).from
      : "/";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        const msg = signInError.message || "Sign in failed.";
        if (/failed to fetch|networkerror|fetch/i.test(msg)) {
          setError(
            "Cannot reach Supabase (Failed to fetch). Restart npm run dev after editing .env, use the URL Vite prints (e.g. localhost:5173), and confirm VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.",
          );
        } else {
          setError(msg);
        }
        return;
      }

      const user = data.user;
      if (!user?.email_confirmed_at) {
        await supabase.auth.signOut();
        setError("Please verify your email before logging in.");
        navigate(`/verify-code?email=${encodeURIComponent(email.trim())}`);
        return;
      }

      const { profile, errorMessage } = await refreshProfile();
      if (!profile) {
        await supabase.auth.signOut();
        setError(
          errorMessage ??
            "Signed in, but your profile could not be loaded. Contact an administrator.",
        );
        return;
      }

      if (profile.approval_status === "rejected") {
        await supabase.auth.signOut();
        setError(
          "Your account registration has been rejected. Please contact the administrator.",
        );
        return;
      }

      if (profile.approval_status !== "approved" || !profile.role) {
        await supabase.auth.signOut();
        setError(
          "Your account has been verified but is still waiting for Admin approval.",
        );
        return;
      }

      navigate(from === "/members" && profile.role !== "admin" ? "/" : from, {
        replace: true,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in only works after email verification and Admin approval."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-ink/10 bg-foam px-4 py-3 text-base text-ink outline-none transition focus:border-sky focus:ring-2 focus:ring-sky/25"
            placeholder="Enter your email address"
          />
        </label>

        <PasswordField
          label="Password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-sky hover:text-sky-bright"
          >
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-press w-full rounded-full bg-sky px-5 py-3.5 text-base font-semibold text-white transition hover:bg-sky-bright disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Login"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone">
        Don&apos;t have an account?{" "}
        <Link to="/signup" className="font-semibold text-sky hover:text-sky-bright">
          Sign Up
        </Link>
      </p>
    </AuthShell>
  );
}
