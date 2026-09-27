import { useEffect, useState, type FormEvent } from "react";
import { broadcastContentChanged } from "./ContentSync";
import {
  DEFAULT_EXTRA_PERSON_RULES,
  chargeForExtraGuest,
  formatMaxGuests,
  type ExtraAppliesTo,
  type ExtraPersonRule,
} from "../lib/guestPricing";
import { fetchRoomAvailability, formatPesoAmount, updateExtraPersonRules } from "../lib/rooms";

const inputClass =
  "mt-1 w-full rounded-xl border border-ink/12 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sky-deep/40 focus:ring-2 focus:ring-sky-deep/15";

function blankRule(): ExtraPersonRule {
  return {
    id: `rule-${Date.now().toString(36)}`,
    minAge: 0,
    maxAge: 6,
    charge: 0,
    appliesTo: "both",
  };
}

export function ExtraPersonSettings() {
  const [rules, setRules] = useState<ExtraPersonRule[]>(DEFAULT_EXTRA_PERSON_RULES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchRoomAvailability().then((snapshot) => {
      if (cancelled || !snapshot?.extraPersonRules?.length) return;
      setRules(snapshot.extraPersonRules);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateRule(id: string, patch: Partial<ExtraPersonRule>) {
    setSaved(false);
    setRules((current) => current.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const next = await updateExtraPersonRules(rules);
      setRules(next);
      setSaved(true);
      broadcastContentChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save extra-person rates.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="rounded-2xl border border-ink/10 bg-white p-4">
      <p className="text-sm font-semibold text-ink">Extra person settings</p>
      <p className="mt-1 text-xs leading-relaxed text-ink/55">
        Guests within a room&apos;s maximum capacity are included in the room rate. Each guest past
        that capacity is charged per night. Children use the age rule. Extra adults always use the
        10+ rate, so the booking form does not ask for an adult&apos;s age. Leave maximum age empty
        for “and older”.
      </p>
      <div className="mt-3 space-y-3">
        {rules.map((rule, index) => (
          <div key={rule.id} className="rounded-xl border border-ink/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-wide text-ink/50 uppercase">
                Rule {index + 1}
              </p>
              <button
                type="button"
                disabled={rules.length <= 1}
                onClick={() => {
                  setSaved(false);
                  setRules((current) => current.filter((item) => item.id !== rule.id));
                }}
                className="text-xs font-semibold text-red-700 disabled:opacity-40"
              >
                Remove
              </button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-ink/70">
                Minimum age
                <input
                  type="number"
                  min={0}
                  max={120}
                  required
                  value={rule.minAge}
                  onChange={(event) => updateRule(rule.id, { minAge: Number(event.target.value) })}
                  className={inputClass}
                />
              </label>
              <label className="block text-xs font-semibold text-ink/70">
                Maximum age
                <input
                  type="number"
                  min={0}
                  max={120}
                  placeholder="And older"
                  value={rule.maxAge ?? ""}
                  onChange={(event) =>
                    updateRule(rule.id, {
                      maxAge: event.target.value === "" ? null : Number(event.target.value),
                    })
                  }
                  className={inputClass}
                />
              </label>
              <label className="block text-xs font-semibold text-ink/70">
                Extra charge (₱)
                <input
                  type="number"
                  min={0}
                  max={100000}
                  required
                  value={rule.charge}
                  onChange={(event) => updateRule(rule.id, { charge: Number(event.target.value) })}
                  className={inputClass}
                />
              </label>
              <label className="block text-xs font-semibold text-ink/70">
                Applies to
                <select
                  value={rule.appliesTo}
                  onChange={(event) =>
                    updateRule(rule.id, { appliesTo: event.target.value as ExtraAppliesTo })
                  }
                  className={inputClass}
                >
                  <option value="both">Adults and kids</option>
                  <option value="adults">Adults only</option>
                  <option value="kids">Kids only</option>
                </select>
              </label>
            </div>
            <p className="mt-2 text-xs text-ink/55">
              {rule.maxAge == null ? `${rule.minAge}+` : `${rule.minAge}–${rule.maxAge}`} years ·{" "}
              {formatPesoAmount(rule.charge)}
            </p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setSaved(false);
          setRules((current) => [...current, blankRule()]);
        }}
        className="btn-press mt-3 text-sm font-semibold text-sky-deep"
      >
        Add age range
      </button>
      {error ? (
        <p className="mt-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? <p className="mt-3 text-sm font-medium text-emerald-800">Saved.</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="btn-press mt-3 rounded-full bg-sky-deep px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save extra person settings"}
      </button>
      <p className="mt-2 text-[0.68rem] text-ink/40">
        Example: an extra adult is {formatPesoAmount(chargeForExtraGuest(10, "adult", rules))} per
        night. Two nights is {formatPesoAmount(chargeForExtraGuest(10, "adult", rules) * 2)}. A
        child age 8 in a room for {formatMaxGuests(2)} is{" "}
        {formatPesoAmount(chargeForExtraGuest(8, "kid", rules))} per night.
      </p>
    </form>
  );
}
