export type PasswordStrengthLevel = "weak" | "moderate" | "strong";

export type PasswordChecks = {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  special: boolean;
};

export function getPasswordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= 11,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function evaluatePasswordStrength(password: string): {
  level: PasswordStrengthLevel;
  checks: PasswordChecks;
  passedCount: number;
  isStrong: boolean;
} {
  const checks = getPasswordChecks(password);
  const passedCount = Object.values(checks).filter(Boolean).length;
  const isStrong = passedCount === 5;

  let level: PasswordStrengthLevel = "weak";
  if (isStrong) {
    level = "strong";
  } else if (password.length >= 6 && passedCount >= 2) {
    level = "moderate";
  }

  return { level, checks, passedCount, isStrong };
}

/** Digits only, max 11 */
export function sanitizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 11);
}

export function isValidPhone11(phone: string): boolean {
  return /^\d{11}$/.test(phone);
}
