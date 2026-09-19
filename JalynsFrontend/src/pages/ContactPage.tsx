import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AdminEditButton } from "../components/AdminEditButton";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { Reveal } from "../components/Reveal";
import { scrollToTopInstant } from "../components/ScrollToTop";
import { useAuth } from "../context/AuthContext";
import { getApiUrl } from "../lib/api";
import {
  DEFAULT_CONTACT_CONTENT,
  DEFAULT_CONTACT_HERO,
  fetchContactContentBackground,
  fetchContactHero,
  removeContactContentBackground,
  removeContactHero,
  subscribeContactBackgrounds,
  uploadContactContentBackgroundWithResult,
  uploadContactHeroWithResult,
} from "../lib/contact";
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

type BgKind = "hero" | "content";

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
    <li className="group flex gap-3.5 rounded-xl border border-[#0b1d33]/10 bg-white/80 px-3.5 py-3.5 shadow-sm backdrop-blur-sm transition hover:border-[#0b1d33]/20 hover:bg-white/90">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b1d33]/10 text-[#0b1d33] transition group-hover:bg-[#0b1d33] group-hover:text-white">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-[#0b1d33]/70 uppercase">
          {label}
        </p>
        <div className="mt-1 text-[0.95rem] font-medium leading-snug text-[#0b1d33] break-words">
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

  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [hasCustomHero, setHasCustomHero] = useState(false);
  const [hasCustomContent, setHasCustomContent] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [bgEditor, setBgEditor] = useState<BgKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const heroInput = useRef<HTMLInputElement>(null);
  const contentInput = useRef<HTMLInputElement>(null);

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

  const displayHero = heroUrl ?? (imagesReady ? DEFAULT_CONTACT_HERO : null);
  const displayContent = contentUrl ?? (imagesReady ? DEFAULT_CONTACT_CONTENT : null);

  const loadImages = useCallback(async () => {
    const [hero, content] = await Promise.all([
      fetchContactHero(),
      fetchContactContentBackground(),
    ]);
    setHeroUrl(hero.url);
    setContentUrl(content.url);
    setHasCustomHero(Boolean(hero.url));
    setHasCustomContent(Boolean(content.url));
    setImagesReady(true);
  }, []);

  useLayoutEffect(() => {
    scrollToTopInstant();
  }, []);

  useEffect(() => {
    document.title = "Contact Us | Jalyn's Resort & Restaurant";
    return () => {
      document.title = "Jalyn's Resort & Restaurant | Puerto Galera";
    };
  }, []);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  useEffect(() => subscribeContactBackgrounds(() => void loadImages()), [loadImages]);

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

  async function onHeroFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setBusy(true);
    setAdminError(null);
    setUploadProgress("Optimizing & uploading hero…");
    const result = await uploadContactHeroWithResult(file);
    if (result.error) setAdminError(result.error);
    else if (result.url) {
      setHeroUrl(result.url);
      setHasCustomHero(true);
      setBgEditor(null);
    }
    setUploadProgress(null);
    setBusy(false);
    if (heroInput.current) heroInput.current.value = "";
  }

  async function onContentFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setBusy(true);
    setAdminError(null);
    setUploadProgress("Optimizing & uploading content background…");
    const result = await uploadContactContentBackgroundWithResult(file);
    if (result.error) setAdminError(result.error);
    else if (result.url) {
      setContentUrl(result.url);
      setHasCustomContent(true);
      setBgEditor(null);
    }
    setUploadProgress(null);
    setBusy(false);
    if (contentInput.current) contentInput.current.value = "";
  }

  async function onRemoveHero() {
    setBusy(true);
    setAdminError(null);
    const message = await removeContactHero();
    if (message) setAdminError(message);
    else {
      setHeroUrl(null);
      setHasCustomHero(false);
      setBgEditor(null);
    }
    setBusy(false);
  }

  async function onRemoveContent() {
    setBusy(true);
    setAdminError(null);
    const message = await removeContactContentBackground();
    if (message) setAdminError(message);
    else {
      setContentUrl(null);
      setHasCustomContent(false);
      setBgEditor(null);
    }
    setBusy(false);
  }

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
    "mt-1.5 w-full rounded-xl border border-[#0b1d33]/12 bg-white px-4 py-3 text-sm text-[#0b1d33] outline-none transition focus:border-sky-deep/40 focus:ring-2 focus:ring-sky-deep/15 sm:text-base";

  const cardClass =
    "rounded-2xl border border-white/35 bg-white/50 text-[#0b1d33] shadow-[0_16px_40px_rgba(8,18,28,0.12)] backdrop-blur-xl sm:rounded-3xl sm:bg-white/45";

  return (
    <main className="overflow-x-clip bg-[#05080f] text-ink">
      <section className="relative min-h-[100svh] overflow-hidden text-white">
        <div className="absolute inset-0 bg-[#07101c]">
          {displayHero ? (
            <img
              src={displayHero}
              alt="Jalyn's Resort in Puerto Galera"
              className="absolute inset-0 h-full w-full object-cover object-center animate-ken-burns"
              fetchPriority="high"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-[#07101c]/50 to-[#05080f]/80" />
          {canEdit ? (
            <button
              type="button"
              onClick={() => setBgEditor("hero")}
              className="absolute inset-0 z-[5] cursor-pointer border-0 bg-transparent"
              aria-label="Change hero background image"
            />
          ) : null}
        </div>

        <Navbar />

        <div
          className={`relative z-10 flex min-h-[100svh] flex-col justify-end px-4 pb-12 pt-[7rem] sm:px-6 sm:pb-20 sm:pt-36 md:px-8 lg:px-10 xl:px-12 ${
            canEdit ? "pointer-events-none" : ""
          }`}
        >
          <p className="animate-fade-up text-[0.62rem] font-semibold tracking-[0.22em] text-white/75 uppercase sm:text-[0.72rem] sm:tracking-[0.28em]">
            Get in touch
          </p>
          <h1
            className="animate-fade-up mt-2.5 max-w-4xl font-display text-[2rem] leading-[1.08] text-white sm:mt-3 sm:text-5xl md:text-6xl lg:text-[4.35rem]"
            style={{ animationDelay: "0.08s" }}
          >
            Contact Us
          </h1>
          <p
            className="animate-fade-up mt-3 max-w-2xl text-[0.92rem] leading-relaxed text-white/85 sm:mt-4 sm:text-lg md:text-xl"
            style={{ animationDelay: "0.16s" }}
          >
            Questions about stays, dining, or diving — send a note and we&apos;ll get back to you.
          </p>
          {canEdit ? (
            <div
              className="pointer-events-auto mt-7 flex flex-wrap gap-2"
              style={{ animationDelay: "0.24s" }}
            >
              <AdminEditButton
                className="animate-fade-up"
                onClick={() => setBgEditor("hero")}
              >
                Change hero background
              </AdminEditButton>
              <AdminEditButton
                className="animate-fade-up"
                onClick={() => setBgEditor("content")}
              >
                Change content background
              </AdminEditButton>
            </div>
          ) : null}
        </div>
      </section>

      <div className="relative isolate">
        {/*
          Viewport-sized sticky backdrop: stays put while content scrolls over it.
          Not stretched to full content height (keeps image quality).
          No parallax / ken-burns — just a static scene behind the cards.
        */}
        <div
          aria-hidden
          className="pointer-events-none sticky top-0 -z-10 h-[100svh] w-full overflow-hidden bg-[#0b1d33]"
        >
          {displayContent ? (
            <img
              src={displayContent}
              alt=""
              className="h-full w-full object-cover object-center"
              loading="eager"
              decoding="async"
            />
          ) : null}
          <div className="absolute inset-0 bg-[#07101c]/62" />
        </div>

        <div className="relative z-0 -mt-[100svh]">
          {canEdit && (adminError || uploadProgress) ? (
            <div className="px-4 pt-5 sm:px-6 sm:pt-6 md:px-8 lg:px-10 xl:px-12">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                {uploadProgress ? <p>{uploadProgress}</p> : null}
                {adminError ? (
                  <p className={uploadProgress ? "mt-2" : undefined}>{adminError}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="relative w-full px-5 pt-10 pb-14 sm:px-6 sm:pt-14 sm:pb-16 md:px-8 lg:px-10 lg:pb-20 xl:px-12">
            <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
              {/* Message form — primary (glass card outside Reveal so backdrop-blur works) */}
              <section className={`lg:col-span-7 ${cardClass} p-6 sm:p-8`}>
                <Reveal variant="up">
                  <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-[#0b1d33]/75 uppercase">
                    Write to us
                  </p>
                  <h2 className="font-display mt-1.5 text-2xl tracking-tight text-[#0b1d33] sm:text-3xl">
                    Send a message
                  </h2>
                  <p className="mt-2 max-w-md text-sm text-[#0b1d33]/80">
                    Your note goes straight to the resort inbox.
                  </p>

                  <form onSubmit={onSend} className="mt-6 space-y-4" noValidate>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-semibold text-[#0b1d33]">Name</span>
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
                        <span className="text-sm font-semibold text-[#0b1d33]">Email</span>
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
                      <span className="text-sm font-semibold text-[#0b1d33]">Message</span>
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
                      <p className="rounded-xl border border-sky-deep/20 bg-white/70 px-3.5 py-2.5 text-sm text-[#0b1d33]">
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
                </Reveal>
              </section>

              {/* Direct contact */}
              <section className={`lg:col-span-5 ${cardClass} p-6 sm:p-7`}>
                <Reveal delay={80} variant="up">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-[#0b1d33]/75 uppercase">
                        Direct lines
                      </p>
                      <h2 className="font-display mt-1.5 text-2xl tracking-tight text-[#0b1d33] sm:text-[1.75rem]">
                        Resort contact
                      </h2>
                      <p className="mt-1.5 text-sm text-[#0b1d33]/80">
                        {loadingSettings ? "Loading details…" : "Call, email, or message us anytime."}
                      </p>
                    </div>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={openEdit}
                        className="btn-press rounded-full border border-[#0b1d33]/15 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-[#0b1d33] transition hover:border-[#0b1d33]/30"
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>

                  <ul className="mt-5 space-y-2.5">
                    <ContactRow icon={<MailIcon className="h-[1.15rem] w-[1.15rem]" />} label="Email">
                      <a
                        href={`mailto:${settings.contact_email}`}
                        className="text-[#0b1d33] transition hover:text-sky-deep"
                      >
                        {settings.contact_email}
                      </a>
                    </ContactRow>
                    <ContactRow icon={<PhoneIcon className="h-[1.15rem] w-[1.15rem]" />} label="Phone">
                      <a
                        href={telHref(settings.phone)}
                        className="text-[#0b1d33] transition hover:text-sky-deep"
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
                        className="inline-flex items-center gap-1.5 text-[#0b1d33] transition hover:text-sky-deep"
                      >
                        Visit our page
                        <ExternalIcon />
                      </a>
                    </ContactRow>
                  </ul>
                </Reveal>
              </section>
            </div>

            {/* Getting here */}
            <section className={`mt-8 sm:mt-10 ${cardClass} p-6 sm:p-8`}>
              <Reveal delay={40} variant="up">
                <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-[#0b1d33]/75 uppercase">
                  Travel
                </p>
                <h2 className="font-display mt-1.5 text-2xl tracking-tight text-[#0b1d33] sm:text-3xl">
                  Getting here
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-[#0b1d33]/80">
                  Reach Puerto Galera by public ferry or private seaplane, then continue to the resort.
                </p>

                <div className="mt-7 grid gap-4 md:grid-cols-2 md:gap-5">
                  <article className="flex h-full flex-col rounded-2xl border border-[#0b1d33]/10 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
                    <h3 className="font-display text-xl text-[#0b1d33]">Public ferries</h3>
                    <p className="mt-2.5 flex-1 text-sm leading-relaxed text-[#0b1d33]/80">
                      Ferries run throughout the day from Batangas Pier to Puerto Galera. Schedules
                      vary — check current departures before you travel.
                    </p>
                    <a
                      href="https://www.puertogaleratransport.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-press mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#0b1d33]/15 bg-white/90 px-4 py-2 text-sm font-semibold text-[#0b1d33] transition hover:border-sky-deep/30 hover:text-sky-deep"
                    >
                      Puerto Galera Transport
                      <ExternalIcon />
                    </a>
                  </article>

                  <article className="flex h-full flex-col rounded-2xl border border-[#0b1d33]/10 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
                    <h3 className="font-display text-xl text-[#0b1d33]">Private seaplane</h3>
                    <p className="mt-2.5 flex-1 text-sm leading-relaxed text-[#0b1d33]/80">
                      Air Juan flies between Manila Bay and Puerto Galera for a faster, scenic arrival.
                    </p>
                    <a
                      href="http://airjuan.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-press mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#0b1d33]/15 bg-white/90 px-4 py-2 text-sm font-semibold text-[#0b1d33] transition hover:border-sky-deep/30 hover:text-sky-deep"
                    >
                      Air Juan
                      <ExternalIcon />
                    </a>
                  </article>
                </div>
              </Reveal>
            </section>

            {/* Map */}
            <section className={`mt-8 overflow-hidden sm:mt-10 ${cardClass}`}>
              <Reveal delay={60} variant="up">
                <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-6 pb-5 sm:px-7 sm:pt-7 sm:pb-6">
                  <div>
                    <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-[#0b1d33]/75 uppercase">
                      Find us
                    </p>
                    <h2 className="font-display mt-1.5 text-2xl tracking-tight text-[#0b1d33] sm:text-3xl">
                      Resort location
                    </h2>
                    {distanceKm != null ? (
                      <p className="mt-2 text-sm text-[#0b1d33]/80">
                        About{" "}
                        <span className="font-semibold text-[#0b1d33]">
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
              </Reveal>
            </section>
          </div>
        </div>
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

      {bgEditor ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-5 text-ink shadow-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-2xl">
                {bgEditor === "hero" ? "Hero background image" : "Content background image"}
              </h2>
              <button
                type="button"
                onClick={() => setBgEditor(null)}
                className="text-sm font-semibold text-stone"
              >
                Close
              </button>
            </div>
            <div className="mt-4">
              <img
                src={
                  bgEditor === "hero"
                    ? (displayHero ?? DEFAULT_CONTACT_HERO)
                    : (displayContent ?? DEFAULT_CONTACT_CONTENT)
                }
                alt="Current background"
                className="aspect-[16/7] w-full rounded-xl object-cover"
              />
              <p className="mt-3 text-sm text-stone">
                Upload a new image to replace this background. Removing it restores the default photo.
                Hero and content backgrounds are saved separately.
              </p>
              <input
                ref={bgEditor === "hero" ? heroInput : contentInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(event) =>
                  void (bgEditor === "hero"
                    ? onHeroFile(event.target.files)
                    : onContentFile(event.target.files))
                }
              />
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setBgEditor(null)}
                  className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold"
                >
                  Cancel
                </button>
                {(bgEditor === "hero" ? hasCustomHero : hasCustomContent) ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void (bgEditor === "hero" ? onRemoveHero() : onRemoveContent())}
                    className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                  >
                    Remove image
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    (bgEditor === "hero" ? heroInput : contentInput).current?.click()
                  }
                  className="btn-press rounded-full bg-sky px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-bright disabled:opacity-60"
                >
                  {busy
                    ? "Uploading…"
                    : (bgEditor === "hero" ? hasCustomHero : hasCustomContent)
                      ? "Replace image"
                      : "Upload image"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
