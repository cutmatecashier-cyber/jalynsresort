import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { PasswordField } from "../components/PasswordField";
import { PasswordStrength } from "../components/PasswordStrength";
import { apiPost } from "../lib/api";
import { evaluatePasswordStrength } from "../lib/validation";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const notice = (location.state as { notice?: string } | null)?.notice;

  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(notice ?? null);
  const [submitting, setSubmitting] = useState(false);

  const passwordMeta = useMemo(() => evaluatePasswordStrength(password), [password]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!passwordMeta.isStrong) {
      setError(
        "Password must be Strong: 11+ characters with uppercase, lowercase, number, and special character.",
      );
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { ok, data } = await apiPost<{ message?: string }>("/api/auth/reset-password", {
        email: email.trim(),
        code: code.trim(),
        password,
        confirmPassword,
      });
      if (!ok) {
        setError(data.message ?? "Could not reset password.");
        return;
      }
      setInfo(data.message ?? "Password updated.");
      window.setTimeout(() => navigate("/login", { replace: true }), 1200);
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-ink/10 bg-foam px-4 py-3 text-base text-ink outline-none transition focus:border-sky focus:ring-2 focus:ring-sky/25";

  const canSubmit =
    Boolean(email.trim()) &&
    code.length === 6 &&
    passwordMeta.isStrong &&
    password === confirmPassword;

  return (
    <AuthShell
      title="Reset password"
      subtitle="Enter the code from your email, then choose a new strong password."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
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
            Reset code
          </span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className={`${fieldClass} tracking-[0.35em]`}
            placeholder="123456"
            autoComplete="one-time-code"
          />
        </label>

        <div>
          <PasswordField
            label="New Password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a strong password"
          />
          <PasswordStrength password={password} />
        </div>

        <div>
          <PasswordField
            label="Confirm Password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
          />
          {confirmPassword ? (
            <p
              className={`mt-1.5 text-xs font-medium ${
                password === confirmPassword ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {password === confirmPassword ? "Passwords match" : "Passwords do not match"}
            </p>
          ) : null}
        </div>

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
          disabled={submitting || !canSubmit}
          className="btn-press w-full rounded-full bg-sky px-5 py-3.5 text-base font-semibold text-white transition hover:bg-sky-bright disabled:opacity-60"
        >
          {submitting ? "Updating…" : "Update password"}
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
