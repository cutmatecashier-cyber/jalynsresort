import { useEffect, useLayoutEffect, useState, type FormEvent } from "react";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { scrollToTopInstant } from "../components/ScrollToTop";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../lib/api";
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
        const res = await fetch(`${API_URL}/api/contact/settings`);
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
        // Permission denied / unavailable — map still works; no distance shown.
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
      const res = await fetch(`${API_URL}/api/contact/message`, {
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
      const res = await fetch(`${API_URL}/api/contact/settings`, {
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
    "w-full rounded-xl border border-ink/10 bg-white/90 px-4 py-3 text-base text-ink outline-none backdrop-blur-sm transition focus:border-sky-deep focus:bg-white focus:ring-2 focus:ring-sky-deep/25";

  const cardClass =
    "h-fit rounded-2xl border border-white/50 bg-white/88 p-5 shadow-[0_10px_28px_rgba(0,0,0,0.18)] backdrop-blur-md sm:p-6";

  const linkClass = "font-medium text-sky-deep hover:text-sky break-all";

  return (
    <main className="relative isolate min-h-screen bg-black text-ink">
      {/* Full-page background (kept) + dark/sky overlay for readable content */}
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
          <p className="text-[0.65rem] font-medium tracking-[0.28em] text-sky-bright uppercase">
            Get in touch
          </p>
          <h1 className="font-display mt-2 text-4xl tracking-tight sm:text-5xl md:text-6xl">
            Contact Us
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            Send a message to Jalyn&apos;s Resort, find our contact details, and see how to get
            here.
          </p>
        </div>
      </section>

      <div className="relative z-10 w-full px-5 pb-14 sm:px-6 sm:pb-16 md:px-8 lg:px-10 lg:pb-20 xl:px-12">
        <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Contact form */}
          <section className={cardClass}>
            <h2 className="font-display text-2xl text-ink sm:text-3xl">Send a message</h2>
            <p className="mt-2 text-sm text-stone">
              We&apos;ll forward your note to the resort contact email.
            </p>
            <form onSubmit={onSend} className="mt-5 space-y-3.5" noValidate>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
                  Name
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={fieldClass}
                  placeholder="Enter your name"
                  autoComplete="name"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
                  Email Address
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass}
                  placeholder="Enter your Email Address"
                  autoComplete="email"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
                  Message
                </span>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={`${fieldClass} min-h-[6.5rem] resize-y`}
                  placeholder="Enter your message"
                />
              </label>
              {formError ? (
                <p
                  className="rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-2.5 text-sm text-red-800"
                  role="alert"
                >
                  {formError}
                </p>
              ) : null}
              {formSuccess ? (
                <p className="rounded-xl border border-sky-deep/25 bg-sky-deep/15 px-3 py-2.5 text-sm text-ink">
                  {formSuccess}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-full bg-sky-deep px-5 py-3 text-base font-semibold text-white transition hover:bg-sky disabled:opacity-60 sm:w-auto sm:px-8"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </form>
          </section>

          {/* Contact info */}
          <section className={cardClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-ink sm:text-3xl">Resort contact</h2>
                <p className="mt-1.5 text-sm text-stone">
                  {loadingSettings ? "Loading contact details…" : "Reach us anytime."}
                </p>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  onClick={openEdit}
                  className="rounded-full border border-ink/15 bg-white/85 px-4 py-2 text-sm font-semibold text-ink backdrop-blur-sm transition hover:bg-white"
                >
                  Edit details
                </button>
              ) : null}
            </div>

            <ul className="mt-5 space-y-4">
              <li>
                <p className="text-xs font-semibold tracking-[0.14em] text-ink/50 uppercase">
                  Email Address
                </p>
                <a href={`mailto:${settings.contact_email}`} className={`mt-1 inline-block ${linkClass}`}>
                  {settings.contact_email}
                </a>
              </li>
              <li>
                <p className="text-xs font-semibold tracking-[0.14em] text-ink/50 uppercase">
                  Telephone Number
                </p>
                <a href={telHref(settings.phone)} className={`mt-1 inline-block ${linkClass}`}>
                  {formatPhMobileForDisplay(settings.phone)}
                </a>
              </li>
              <li>
                <p className="text-xs font-semibold tracking-[0.14em] text-ink/50 uppercase">
                  Facebook
                </p>
                <a
                  href={settings.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-1 inline-block ${linkClass}`}
                >
                  Visit our Facebook page
                </a>
              </li>
            </ul>
          </section>
        </div>

        {/* Getting Here */}
        <section className={`mt-8 sm:mt-10 ${cardClass}`}>
          <h2 className="font-display text-2xl text-ink sm:text-3xl">
            Getting Here with Public Ferries or Seaplane
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold tracking-[0.14em] text-sky-deep uppercase">
                Public Ferries
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-stone sm:text-base">
                There are public ferries running throughout the day from Batangas Pier to Puerto
                Galera. Trip times vary.
              </p>
              <p className="mt-2.5 text-sm text-ink">
                For the latest schedules and booking services, visit{" "}
                <a
                  href="https://www.puertogaleratransport.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sky-deep hover:text-sky"
                >
                  Puerto Galera Transport
                </a>
                .
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-[0.14em] text-sky-deep uppercase">
                Private Seaplane
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-stone sm:text-base">
                Air Juan provides a seaplane service to and from Manila Bay and Puerto Galera.
              </p>
              <p className="mt-2.5 text-sm text-ink">
                For details and bookings, visit{" "}
                <a
                  href="http://airjuan.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sky-deep hover:text-sky"
                >
                  Air Juan
                </a>
                .
              </p>
            </div>
          </div>
        </section>

        {/* Location + Map — Open in Maps lives in header so Google's chip can be cropped away */}
        <section className="mt-8 h-fit overflow-hidden rounded-2xl border border-white/50 bg-white/88 shadow-[0_10px_28px_rgba(0,0,0,0.18)] backdrop-blur-md sm:mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-5 pb-4 sm:px-5 sm:pt-6 sm:pb-5">
            <h2 className="font-display text-2xl text-ink sm:text-3xl">
              Jalyn&apos;s Resort Location
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {distanceKm != null ? (
                <p className="rounded-full border border-sky-deep/30 bg-sky-deep/20 px-3.5 py-1.5 text-sm text-ink">
                  Approximately{" "}
                  <strong className="text-sky-deep">
                    {distanceKm < 1
                      ? `${Math.round(distanceKm * 1000)} m`
                      : `${distanceKm.toFixed(1)} km`}
                  </strong>{" "}
                  away
                </p>
              ) : null}
              <a
                href={mapsOpenUrl(RESORT_LOCATION.fullAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-sky-deep px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky"
              >
                Open in Maps
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden
                  className="h-3.5 w-3.5"
                >
                  <path
                    d="M7.5 4.5H15.5V12.5M15.5 4.5L5 15"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </div>
          </div>

          <div className="relative border-t border-white/25">
            <div className="relative h-52 w-full overflow-hidden sm:h-64 lg:h-72">
              <iframe
                title="Jalyn's Resort & Restaurant on Google Maps"
                src={mapsEmbedUrl(RESORT_LOCATION.lat, RESORT_LOCATION.lng)}
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />

              {/* Address inside map area */}
              <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/20 bg-black/55 px-3 py-2.5 backdrop-blur-md sm:px-4">
                <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-sky-bright uppercase">
                  Address
                </p>
                <p className="mt-0.5 text-sm leading-snug text-white sm:text-[0.95rem]">
                  {RESORT_LOCATION.addressLine}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />

      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-white/60 bg-white/95 p-5 text-ink shadow-xl backdrop-blur-md sm:p-6"
          >
            <h2 className="font-display text-2xl">Edit contact details</h2>
            <p className="mt-2 text-sm text-stone">
              Admin only — updates appear on this page for everyone.
            </p>
            <form onSubmit={saveEdit} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
                  Contact Email Address
                </span>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
                  Telephone Number
                </span>
                <div className="flex overflow-hidden rounded-xl border border-ink/10 bg-white/90 focus-within:border-sky-deep focus-within:ring-2 focus-within:ring-sky-deep/25">
                  <span
                    className="inline-flex shrink-0 items-center border-r border-ink/10 bg-mist/80 px-3 text-base font-semibold text-ink/80"
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
                    className="w-full border-0 bg-transparent px-4 py-3 text-base text-ink outline-none"
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
                <span className="mb-1.5 block text-xs font-semibold tracking-[0.14em] text-ink/70 uppercase">
                  Facebook Link
                </span>
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
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-full bg-sky-deep px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky disabled:opacity-60"
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
