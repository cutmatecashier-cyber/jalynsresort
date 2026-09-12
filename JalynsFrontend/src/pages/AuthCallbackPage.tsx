import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { supabase } from "../lib/supabase";

/** Handles Supabase email-confirmation redirect (PKCE code or session in URL). */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Confirming your email…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function finish() {
      const url = window.location.href;
      const hasCode = new URL(url).searchParams.has("code");

      if (hasCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (!active) return;
        if (error) {
          setFailed(true);
          setMessage(error.message || "Could not confirm your email.");
          return;
        }
      } else {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error || !data.session) {
          setFailed(true);
          setMessage("Could not confirm your email. Try the link again or log in.");
          return;
        }
      }

      setMessage("Email verified. You can log in once an Admin approves your account.");
      await supabase.auth.signOut();
      window.setTimeout(() => {
        if (active) navigate("/login", { replace: true });
      }, 1600);
    }

    void finish();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <AuthShell title="Email verification" subtitle={message}>
      <Link
        to="/login"
        className="inline-flex w-full items-center justify-center rounded-full bg-sky px-5 py-3.5 text-base font-semibold text-white transition hover:bg-sky-bright"
      >
        {failed ? "Back to Login" : "Continue to Login"}
      </Link>
    </AuthShell>
  );
}
