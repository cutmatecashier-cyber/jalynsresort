type NumberStepperProps = {
  label: string;
  value: number | null;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number | null) => void;
  hint?: string;
  /** Minus at the minimum clears the value. */
  allowEmpty?: boolean;
  emptyLabel?: string;
};

export function NumberStepper({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  hint,
  allowEmpty = false,
  emptyLabel = "—",
}: NumberStepperProps) {
  const shown = value == null ? emptyLabel : String(value);

  function decrease() {
    if (value == null) return;
    const next = value - step;
    if (next < min) {
      onChange(allowEmpty ? null : min);
      return;
    }
    onChange(next);
  }

  function increase() {
    if (value == null) {
      onChange(min);
      return;
    }
    onChange(Math.min(max, value + step));
  }

  return (
    <div>
      <div className="mt-1.5 flex items-center justify-between gap-3 rounded-xl border border-ink/12 bg-white px-3.5 py-2.5">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={value == null || (!allowEmpty && value <= min)}
            onClick={decrease}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 text-base leading-none disabled:opacity-40"
            aria-label={`Decrease ${label}`}
          >
            −
          </button>
          <span className="min-w-8 text-center text-sm font-semibold tabular-nums text-ink">
            {shown}
          </span>
          <button
            type="button"
            disabled={value != null && value >= max}
            onClick={increase}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 text-base leading-none disabled:opacity-40"
            aria-label={`Increase ${label}`}
          >
            +
          </button>
        </span>
      </div>
      {hint ? <span className="mt-1 block text-xs font-medium text-ink/45">{hint}</span> : null}
    </div>
  );
}
