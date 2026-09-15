import { useEffect, useLayoutEffect, useState, type FormEvent, type ReactNode } from "react";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { Reveal } from "../components/Reveal";
import { scrollToTopInstant } from "../components/ScrollToTop";
import { useAuth } from "../context/AuthContext";
import { getApiUrl } from "../lib/api";
import {
  formatPhMobileForDisplay,
  formatPhMobileForStorage,
  haversineKm,
  isValidPhMobileLocal,
  mapsEmbedUrl,
  mapsOpenUrl,
  RESORT_LOCATION,
  sanitizeLocalPhMobileInput,
  toLocalPhMobileDigits,
  type ResortContactSettings,
} from "../lib/resortLocation";
import { supabase } from "../lib/supabase";

const DEFAULT_SETTINGS: ResortContactSettings = {
  contact_email: "jalynsresort@gmail.com",
  phone: "+639476197535",
  facebook_url: "https://www.facebook.com/jalynsresortpuertogalera",
};

const PAGE_BG =
  "url(https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=2400&q=80)";

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function MailIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="m4.5 7.5 7.5 5.5 7.5-5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhoneIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8.5 4.5h2.2l1.1 3.2-1.4 1.1a11.5 11.5 0 0 0 4.8 4.8l1.1-1.4 3.2 1.1v2.2a1.7 1.7 0 0 1-1.8 1.7C10.8 16.7 7.3 13.2 6.8 6.3a1.7 1.7 0 0 1 1.7-1.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FacebookIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 8.5h2.5V5.8A18 18 0 0 0 14 5.5c-2.3 0-3.8 1.4-3.8 4V12H7.5v3h2.7v7h3.2v-7H16l.5-3h-2.8V9.7c0-.7.2-1.2.8-1.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ExternalIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M7.5 4.5H15.5V12.5M15.5 4.5L5 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <li className="group flex gap-3.5 rounded-xl border border-ink/8 bg-white/70 px-3.5 py-3.5 transition hover:border-sky-deep/25 hover:bg-white">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-deep/10 text-sky-deep transition group-hover:bg-sky-deep group-hover:text-white">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-stone uppercase">
          {label}
        </p>
        <div className="mt-1 text-[0.95rem] font-medium leading-snug text-ink break-words">
          {children}
        </div>
      </div>
    </li>
  );
}

export function ContactPage() {
  const { role, approvalStatus, can } = useAuth();
  const canEdit = can.canEditContactInfo(role, approvalStatus);

  const [settings, setSettings] = useState<ResortContactSettings>(DEFAULT_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editFacebook, setEditFacebook] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  /** Only set when geolocation succeeds — never a hard-coded value. */
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  useLayoutEffect(() => {
    scrollToTopInstant();
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoadingSettings(true);
      try {
        const res = await fetch(`${getApiUrl()}/api/contact/settings`);
        const body = (await res.json()) as {
          success?: boolean;
          settings?: ResortContactSettings;
        };
        if (active && body.settings) setSettings(body.settings);
      } catch {
        // keep defaults
      } finally {
        if (active) setLoadingSettings(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDistanceKm(
          haversineKm(
            pos.coords.latitude,
            pos.coords.longitude,
            RESORT_LOCATION.lat,
            RESORT_LOCATION.lng,
          ),
        );
      },
      () => {
        setDistanceKm(null);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 },
    );
  }, []);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSending(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/contact/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      const body = (await res.json()) as { message?: string };
      if (!res.ok) {
        setFormError(body.message ?? "Could not send your message.");
        return;
      }
      setFormSuccess(body.message ?? "Message sent. Thank you!");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setFormError("Cannot reach the server. Make sure the backend is running.");
    } finally {
      setSending(false);
    }
  }

  function openEdit() {
    setEditEmail(settings.contact_email);
    setEditPhone(toLocalPhMobileDigits(settings.phone));
    setEditFacebook(settings.facebook_url);
    setEditError(null);
    setEditOpen(true);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    setEditError(null);
    const localPhone = sanitizeLocalPhMobileInput(editPhone);
    if (!isValidPhMobileLocal(localPhone)) {
      setEditError("Enter a valid 10-digit phone number after +63.");
      return;
    }
    setEditSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setEditError("Admin session expired. Please log in again.");
        return;
      }
      const res = await fetch(`${getApiUrl()}/api/contact/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contact_email: editEmail.trim(),
          phone: formatPhMobileForStorage(localPhone),
          facebook_url: editFacebook.trim(),
        }),
      });
      const body = (await res.json()) as {
        message?: string;
        settings?: ResortContactSettings;
      };
      if (!res.ok) {
        setEditError(body.message ?? "Could not save contact settings.");
        return;
      }
      if (body.settings) setSettings(body.settings);
      setEditOpen(false);
    } catch {
      setEditError("Cannot reach the server. Make sure the backend is running.");
    } finally {
      setEditSaving(false);
    }
  }

  const fieldClass =
    "mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-sky-deep/40 focus:ring-2 focus:ring-sky-deep/15 sm:text-base";

  const cardClass =
    "rounded-2xl border border-white/50 bg-white/88 shadow-[0_10px_28px_rgba(0,0,0,0.18)] backdrop-blur-md";

  return (
    <main className="relative isolate min-h-screen bg-black text-ink">
      <div
        className="pointer-events-none fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: PAGE_BG }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black/80 via-black/55 to-black/85"
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-sky-deep/15" aria-hidden />

      <section className="relative text-white">
        <Navbar />
        <div
          className={`relative z-10 w-full px-5 pb-12 sm:px-6 sm:pb-14 md:px-8 lg:px-10 xl:px-12 ${
            canEdit ? "pt-40 sm:pt-44 lg:pt-48" : "pt-36 sm:pt-40 lg:pt-44"
          }`}
        >
          <p className="animate-fade-up text-[0.65rem] font-medium tracking-[0.28em] text-sky-bright uppercase">
            Get in touch
          </p>
          <h1 className="animate-fade-up font-display mt-2 text-4xl tracking-tight sm:text-5xl md:text-6xl">
            Contact Us
          </h1>
          <p className="animate-fade-up mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            Questions about stays, dining, or diving — send a note and we&apos;ll get back to you.
          </p>
        </div>
      </section>

      <div className="relative z-10 w-full px-5 pb-14 sm:px-6 sm:pb-16 md:px-8 lg:px-10 lg:pb-20 xl:px-12">
        <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Message form — primary */}
          <Reveal className="lg:col-span-7" variant="up">
            <section className={`${cardClass} p-6 sm:p-8`}>
              <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-sky-deep uppercase">
                Write to us
              </p>
              <h2 className="font-display mt-1.5 text-2xl tracking-tight text-ink sm:text-3xl">
                Send a message
              </h2>
              <p className="mt-2 max-w-md text-sm text-stone">
                Your note goes straight to the resort inbox.
              </p>

              <form onSubmit={onSend} className="mt-6 space-y-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Name</span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={fieldClass}
                      placeholder="Your name"
                      autoComplete="name"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-ink">Email</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={fieldClass}
                      placeholder="you@email.com"
                      autoComplete="email"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-semibold text-ink">Message</span>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className={`${fieldClass} min-h-[8rem] resize-y`}
                    placeholder="How can we help?"
                  />
                </label>

                {formError ? (
                  <p
                    className="rounded-xl border border-red-200/80 bg-red-50/90 px-3.5 py-2.5 text-sm text-red-800"
                    role="alert"
                  >
                    {formError}
                  </p>
                ) : null}
                {formSuccess ? (
                  <p className="rounded-xl border border-sky-deep/20 bg-sky-deep/10 px-3.5 py-2.5 text-sm text-ink">
                    {formSuccess}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={sending}
                  className="btn-press w-full rounded-full bg-sky-deep px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(3,105,161,0.28)] transition hover:bg-sky disabled:opacity-60 sm:w-auto sm:px-8"
                >
                  {sending ? "Sending…" : "Send message"}
                </button>
              </form>
            </section>
          </Reveal>

          {/* Direct contact */}
          <Reveal className="lg:col-span-5" delay={80} variant="up">
            <section className={`${cardClass} p-6 sm:p-7`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-sky-deep uppercase">
                    Direct lines
                  </p>
                  <h2 className="font-display mt-1.5 text-2xl tracking-tight text-ink sm:text-[1.75rem]">
                    Resort contact
                  </h2>
                  <p className="mt-1.5 text-sm text-stone">
                    {loadingSettings ? "Loading details…" : "Call, email, or message us anytime."}
                  </p>
                </div>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={openEdit}
                    className="btn-press rounded-full border border-ink/12 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink transition hover:border-ink/25"
                  >
                    Edit
                  </button>
                ) : null}
              </div>

              <ul className="mt-5 space-y-2.5">
                <ContactRow icon={<MailIcon className="h-[1.15rem] w-[1.15rem]" />} label="Email">
                  <a
                    href={`mailto:${settings.contact_email}`}
                    className="text-sky-deep transition hover:text-sky"
                  >
                    {settings.contact_email}
                  </a>
                </ContactRow>
                <ContactRow icon={<PhoneIcon className="h-[1.15rem] w-[1.15rem]" />} label="Phone">
                  <a
                    href={telHref(settings.phone)}
                    className="text-sky-deep transition hover:text-sky"
                  >
                    {formatPhMobileForDisplay(settings.phone)}
                  </a>
                </ContactRow>
                <ContactRow
                  icon={<FacebookIcon className="h-[1.15rem] w-[1.15rem]" />}
                  label="Facebook"
                >
                  <a
                    href={settings.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sky-deep transition hover:text-sky"
                  >
                    Visit our page
                    <ExternalIcon />
                  </a>
                </ContactRow>
              </ul>
            </section>
          </Reveal>
        </div>

        {/* Getting here */}
        <Reveal delay={40} variant="up">
          <section className={`mt-8 sm:mt-10 ${cardClass} p-6 sm:p-8`}>
            <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-sky-deep uppercase">
              Travel
            </p>
            <h2 className="font-display mt-1.5 text-2xl tracking-tight text-ink sm:text-3xl">
              Getting here
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-stone">
              Reach Puerto Galera by public ferry or private seaplane, then continue to the resort.
            </p>

            <div className="mt-7 grid gap-4 md:grid-cols-2 md:gap-5">
              <article className="flex h-full flex-col rounded-2xl border border-ink/8 bg-mist/50 p-5 sm:p-6">
                <h3 className="font-display text-xl text-ink">Public ferries</h3>
                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-stone">
                  Ferries run throughout the day from Batangas Pier to Puerto Galera. Schedules
                  vary — check current departures before you travel.
                </p>
                <a
                  href="https://www.puertogaleratransport.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-press mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-ink/12 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-sky-deep/30 hover:text-sky-deep"
                >
                  Puerto Galera Transport
                  <ExternalIcon />
                </a>
              </article>

              <article className="flex h-full flex-col rounded-2xl border border-ink/8 bg-mist/50 p-5 sm:p-6">
                <h3 className="font-display text-xl text-ink">Private seaplane</h3>
                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-stone">
                  Air Juan flies between Manila Bay and Puerto Galera for a faster, scenic arrival.
                </p>
                <a
                  href="http://airjuan.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-press mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-ink/12 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-sky-deep/30 hover:text-sky-deep"
                >
                  Air Juan
                  <ExternalIcon />
                </a>
              </article>
            </div>
          </section>
        </Reveal>

        {/* Map */}
        <Reveal delay={60} variant="up">
          <section className={`mt-8 overflow-hidden sm:mt-10 ${cardClass}`}>
            <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-6 pb-5 sm:px-7 sm:pt-7 sm:pb-6">
              <div>
                <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-sky-deep uppercase">
                  Find us
                </p>
                <h2 className="font-display mt-1.5 text-2xl tracking-tight text-ink sm:text-3xl">
                  Resort location
                </h2>
                {distanceKm != null ? (
                  <p className="mt-2 text-sm text-stone">
                    About{" "}
                    <span className="font-semibold text-sky-deep">
                      {distanceKm < 1
                        ? `${Math.round(distanceKm * 1000)} m`
                        : `${distanceKm.toFixed(1)} km`}
                    </span>{" "}
                    from your current location
                  </p>
                ) : null}
              </div>
              <a
                href={mapsOpenUrl(RESORT_LOCATION.fullAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-press inline-flex items-center gap-2 rounded-full bg-sky-deep px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(3,105,161,0.28)] transition hover:bg-sky"
              >
                Open in Maps
                <ExternalIcon className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="relative border-t border-ink/8">
              <div className="relative h-56 w-full overflow-hidden sm:h-72 lg:h-80">
                <iframe
                  title="Jalyn's Resort & Restaurant on Google Maps"
                  src={mapsEmbedUrl(RESORT_LOCATION.lat, RESORT_LOCATION.lng)}
                  className="absolute inset-0 h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
                <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/15 bg-gradient-to-t from-black/75 via-black/55 to-black/20 px-4 py-3.5 sm:px-5">
                  <p className="text-[0.62rem] font-semibold tracking-[0.18em] text-sky-bright uppercase">
                    Address
                  </p>
                  <p className="mt-1 text-sm leading-snug text-white sm:text-[0.95rem]">
                    {RESORT_LOCATION.addressLine}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </Reveal>
      </div>

      <Footer />

      {editOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !editSaving && setEditOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit contact details"
            className="w-full max-w-md rounded-2xl border border-white/60 bg-white p-5 text-ink shadow-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-2xl">Edit contact details</h2>
            <p className="mt-1.5 text-sm text-stone">
              Admin only — updates appear on this page for everyone.
            </p>
            <form onSubmit={saveEdit} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-ink">Contact email</span>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Phone</span>
                <div className="mt-1.5 flex overflow-hidden rounded-xl border border-ink/10 bg-white focus-within:border-sky-deep/40 focus-within:ring-2 focus-within:ring-sky-deep/15">
                  <span
                    className="inline-flex shrink-0 items-center border-r border-ink/10 bg-mist/80 px-3 text-sm font-semibold text-ink/80"
                    aria-hidden
                  >
                    +63
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(sanitizeLocalPhMobileInput(e.target.value))}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData("text");
                      setEditPhone(sanitizeLocalPhMobileInput(pasted));
                    }}
                    onKeyDown={(e) => {
                      const allowedKeys = [
                        "Backspace",
                        "Delete",
                        "Tab",
                        "ArrowLeft",
                        "ArrowRight",
                        "Home",
                        "End",
                      ];
                      if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) return;
                      if (!/^\d$/.test(e.key)) {
                        e.preventDefault();
                        return;
                      }
                      if (editPhone.length >= 10 && !window.getSelection()?.toString()) {
                        e.preventDefault();
                      }
                    }}
                    maxLength={10}
                    placeholder="9476197535"
                    className="w-full border-0 bg-transparent px-4 py-3 text-sm text-ink outline-none sm:text-base"
                    aria-label="10-digit mobile number after +63"
                  />
                </div>
                <p className="mt-1.5 text-xs text-stone">
                  Digits only · max 10 after +63
                  {editPhone.length === 10
                    ? ` · Saves as ${formatPhMobileForStorage(editPhone)}`
                    : null}
                </p>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-ink">Facebook link</span>
                <input
                  type="url"
                  required
                  value={editFacebook}
                  onChange={(e) => setEditFacebook(e.target.value)}
                  className={fieldClass}
                  placeholder="https://www.facebook.com/..."
                />
              </label>
              {editError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                  {editError}
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={editSaving}
                  onClick={() => setEditOpen(false)}
                  className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="btn-press rounded-full bg-sky-deep px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky disabled:opacity-60"
                >
                  {editSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
