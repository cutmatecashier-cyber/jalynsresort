import { Link } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";

export function VerifyEmailPage() {
  const { signOut, user } = useAuth();
  const email = user?.email ?? "";

  return (
    <AuthShell
      title="Verify your email"
      subtitle="Enter the 6-digit code we sent to your email (Gmail SMTP), then wait for Admin approval before logging in."
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to={email ? `/verify-code?email=${encodeURIComponent(email)}` : "/verify-code"}
          onClick={() => void signOut()}
          className="btn-press inline-flex flex-1 items-center justify-center rounded-full bg-sky px-5 py-3.5 text-base font-semibold text-white transition hover:bg-sky-bright"
        >
          Enter code
        </Link>
        <Link
          to="/"
          className="btn-press inline-flex flex-1 items-center justify-center rounded-full border border-ink/15 px-5 py-3.5 text-base font-semibold text-ink transition hover:bg-foam"
        >
          Home
        </Link>
      </div>
    </AuthShell>
  );
}
