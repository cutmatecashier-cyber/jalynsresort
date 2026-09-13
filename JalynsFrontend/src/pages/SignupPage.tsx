import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { PasswordField } from "../components/PasswordField";
import { PasswordStrength } from "../components/PasswordStrength";
import { apiPost } from "../lib/api";
import {
  evaluatePasswordStrength,
  isValidPhone11,
  sanitizePhoneDigits,
} from "../lib/validation";

export function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passwordMeta = useMemo(() => evaluatePasswordStrength(password), [password]);
  const phoneError =
    phoneTouched || phone.length > 0
      ? phone.length === 0
        ? "Phone number is required."
        : phone.length < 11
          ? "Phone number must be exactly 11 digits."
          : null
      : null;

  function onPhoneChange(raw: string) {
    setPhone(sanitizePhoneDigits(raw));
    setPhoneTouched(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPhoneTouched(true);

    if (!isValidPhone11(phone)) {
      setError("Phone number must be exactly 11 digits (numbers only).");
      return;
    }
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
      const { ok, data } = await apiPost<{ message?: string; email?: string }>(
        "/api/auth/register",
        {
          name: name.trim(),
          phone,
          email: email.trim(),
          password,
        },
      );

      if (!ok) {
        setError(data.message ?? "Sign up failed.");
        return;
      }

      navigate(`/verify-code?email=${encodeURIComponent(email.trim())}`, {
        replace: true,
      });
    } catch {
      setError("Cannot reach the API. Make sure the backend is running on port 3000.");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass =
    "w-full rounded-xl border border-ink/10 bg-foam px-4 py-3 text-base text-ink outline-none transition focus:border-sky focus:ring-2 focus:ring-sky/25";

  return (
    <AuthShell
      title="Create account"
      subtitle="Register with your details. You will enter a verification code from email. An Admin assigns Manager or Owner later."
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <section className="space-y-3">
          <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-stone uppercase">
            Personal
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
                Name
              </span>
              <input
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={fieldClass}
                placeholder="Full name"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
                Phone Number
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="tel"
                required
                value={phone}
                maxLength={11}
                onChange={(e) => onPhoneChange(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  onPhoneChange(e.clipboardData.getData("text"));
                }}
                onKeyDown={(e) => {
                  if (
                    e.key.length === 1 &&
                    !/[0-9]/.test(e.key) &&
                    !e.ctrlKey &&
                    !e.metaKey &&
                    !e.altKey
                  ) {
                    e.preventDefault();
                  }
                }}
                className={`${fieldClass} ${phoneError ? "border-red-300 focus:border-red-400 focus:ring-red-200" : ""}`}
                placeholder="09XXXXXXXXX"
                aria-invalid={Boolean(phoneError)}
                aria-describedby={phoneError ? "phone-error" : undefined}
              />
              {phoneError ? (
                <p id="phone-error" className="mt-1.5 text-xs font-medium text-red-700" role="alert">
                  {phoneError}
                </p>
              ) : phone.length === 11 ? (
                <p className="mt-1.5 text-xs font-medium text-emerald-700">Valid 11-digit number</p>
              ) : null}
            </label>
          </div>
        </section>

        <section className="space-y-3 border-t border-ink/8 pt-4">
          <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-stone uppercase">
            Contact
          </p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
              Gmail / Email
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
              placeholder="Enter your email address"
            />
          </label>
        </section>

        <section className="space-y-3 border-t border-ink/8 pt-4">
          <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-stone uppercase">
            Security
          </p>
          <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
            <div>
              <PasswordField
                label="Password"
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
                placeholder="Repeat password"
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
          </div>
        </section>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="btn-press w-full rounded-full bg-sky px-5 py-3.5 text-base font-semibold text-white transition hover:bg-sky-bright disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Sign Up"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-sky hover:text-sky-bright">
          Login
        </Link>
      </p>
    </AuthShell>
  );
}
