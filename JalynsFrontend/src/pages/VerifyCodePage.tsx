import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { apiPost } from "../lib/api";

export function VerifyCodePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const { ok, data } = await apiPost<{ message?: string }>("/api/auth/verify-email-code", {
        email: email.trim(),
        code: code.trim(),
      });
      if (!ok) {
        setError(data.message ?? "Verification failed.");
        return;
      }
      setInfo(data.message ?? "Email verified.");
      window.setTimeout(() => navigate("/login", { replace: true }), 1200);
    } finally {
      setSubmitting(false);
    }
  }

  async function onResend() {
    setError(null);
    setInfo(null);
    const { ok, data, status } = await apiPost<{ message?: string; cooldownSeconds?: number }>(
      "/api/auth/send-verification-code",
      { email: email.trim() },
    );
    if (!ok) {
      setError(data.message ?? "Could not resend code.");
      if (status === 429) setCooldown(60);
      return;
    }
    setInfo(data.message ?? "Code sent.");
    setCooldown(data.cooldownSeconds ?? 60);
  }

  const fieldClass =
    "w-full rounded-xl border border-ink/10 bg-foam px-4 py-3 text-base text-ink outline-none transition focus:border-sky focus:ring-2 focus:ring-sky/25";

  return (
    <AuthShell
      title="Enter verification code"
      subtitle="We emailed a 6-digit code from our Gmail SMTP sender. Enter it below to verify your account."
    >
      <form onSubmit={onVerify} className="space-y-4" noValidate>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
            autoComplete="email"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
            Verification code
          </span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className={`${fieldClass} tracking-[0.35em]`}
            placeholder="123456"
            autoComplete="one-time-code"
          />
        </label>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="rounded-xl border border-sky/20 bg-sky/10 px-3 py-2.5 text-sm text-ink">{info}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="btn-press w-full rounded-full bg-sky px-5 py-3.5 text-base font-semibold text-white transition hover:bg-sky-bright disabled:opacity-60"
        >
          {submitting ? "Verifying…" : "Verify email"}
        </button>
      </form>

      <button
        type="button"
        disabled={cooldown > 0 || !email.trim()}
        onClick={() => void onResend()}
        className="btn-press mt-4 w-full rounded-full border border-ink/15 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-foam disabled:cursor-not-allowed disabled:opacity-50"
      >
        {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
      </button>

      <p className="mt-6 text-center text-sm text-stone">
        <Link to="/login" className="font-semibold text-sky hover:text-sky-bright">
          Back to Login
        </Link>
      </p>
    </AuthShell>
  );
}
