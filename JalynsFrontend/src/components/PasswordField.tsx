import { useState, type InputHTMLAttributes } from "react";
import { EyeIcon, EyeOffIcon } from "./Icons";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export function PasswordField({ label, className, id, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? props.name ?? "password";

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
        {label}
      </span>
      <span className="relative block">
        <input
          {...props}
          id={inputId}
          type={visible ? "text" : "password"}
          className={
            className ??
            "w-full rounded-xl border border-ink/10 bg-foam py-3 pr-12 pl-4 text-base text-ink outline-none transition focus:border-sky focus:ring-2 focus:ring-sky/25"
          }
        />
        <button
          type="button"
          tabIndex={0}
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-stone transition hover:text-ink"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </span>
    </label>
  );
}
