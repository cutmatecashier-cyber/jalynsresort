import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { apiPost } from "../lib/api";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { ok, data } = await apiPost<{ message?: string; email?: string }>(
        "/api/auth/forgot-password",
        { email: email.trim() },
      );
      if (!ok) {
        setError(data.message ?? "Could not send reset code.");
        return;
      }
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`, {
        replace: true,
        state: { notice: data.message },
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your registered email. If it exists, we will send a reset code via Gmail SMTP."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-ink/10 bg-foam px-4 py-3 text-base text-ink outline-none transition focus:border-sky focus:ring-2 focus:ring-sky/25"
            placeholder="Enter your email address"
          />
        </label>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="btn-press w-full rounded-full bg-sky px-5 py-3.5 text-base font-semibold text-white transition hover:bg-sky-bright disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send reset code"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone">
        <Link to="/login" className="font-semibold text-sky hover:text-sky-bright">
          Back to Login
        </Link>
      </p>
    </AuthShell>
  );
}
