import {
  evaluatePasswordStrength,
  type PasswordChecks,
  type PasswordStrengthLevel,
} from "../lib/validation";

const levelStyles: Record<
  PasswordStrengthLevel,
  { label: string; bar: string; text: string }
> = {
  weak: { label: "Weak", bar: "bg-rose-400/80 w-1/3", text: "text-rose-500" },
  moderate: { label: "Moderate", bar: "bg-amber-500 w-2/3", text: "text-amber-800" },
  strong: { label: "Strong", bar: "bg-emerald-500 w-full", text: "text-emerald-800" },
};

const checklist: { key: keyof PasswordChecks; label: string }[] = [
  { key: "length", label: "11+ characters" },
  { key: "upper", label: "Uppercase letter" },
  { key: "lower", label: "Lowercase letter" },
  { key: "number", label: "Number" },
  { key: "special", label: "Special character (!@#$%&*)" },
];

type PasswordStrengthProps = {
  password: string;
};

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const { level, checks } = evaluatePasswordStrength(password);
  const style = levelStyles[level];

  return (
    <div className="mt-2 space-y-2" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
          <div className={`h-full rounded-full transition-all ${style.bar}`} />
        </div>
        <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
      </div>

      <ul className="space-y-1 text-xs">
        {checklist.map((item) => {
          const ok = checks[item.key];
          return (
            <li
              key={item.key}
              className={ok ? "font-medium text-emerald-700" : "text-stone"}
            >
              <span className="mr-1.5 inline-block w-3">{ok ? "✓" : "○"}</span>
              {item.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
