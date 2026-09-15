import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { roleLabel } from "../lib/permissions";

type NavItem =
  | { label: string; shortLabel: string; kind: "hash"; hash: string }
  | { label: string; shortLabel: string; kind: "route"; to: string };

const links: NavItem[] = [
  { label: "Home", shortLabel: "Home", kind: "hash", hash: "#home" },
  { label: "Rooms and Apartments", shortLabel: "Rooms", kind: "hash", hash: "#rooms" },
  { label: "Restaurant", shortLabel: "Restaurant", kind: "route", to: "/restaurant" },
  { label: "Scuba Diving", shortLabel: "Scuba Diving", kind: "route", to: "/scuba-diving" },
  { label: "SPA", shortLabel: "SPA", kind: "route", to: "/spa" },
  { label: "News, Offers and Events", shortLabel: "News", kind: "hash", hash: "#news" },
  { label: "Contact Us", shortLabel: "Contact Us", kind: "route", to: "/contact" },
];

function NavAnchor({
  item,
  className,
  onClick,
  style,
  useShortLabel = false,
}: {
  item: NavItem;
  className: string;
  onClick?: () => void;
  style?: CSSProperties;
  useShortLabel?: boolean;
}) {
  const text = useShortLabel ? item.shortLabel : item.label;
  if (item.kind === "route") {
    return (
      <Link to={item.to} className={className} onClick={onClick} style={style}>
        {text}
      </Link>
    );
  }
  return (
    <a href={`/${item.hash}`} className={className} onClick={onClick} style={style}>
      {text}
    </a>
  );
}

export function Navbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { role, approvalStatus, can, signOut, profile } = useAuth();
  const showMember = can.canManageMembers(role, approvalStatus);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const html = document.documentElement;
    document.body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    const lenis = (window as Window & { __lenis?: { stop: () => void; start: () => void } })
      .__lenis;
    lenis?.stop();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.removeProperty("overflow");
      html.style.removeProperty("overflow");
      lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    let attached: {
      on: (e: string, cb: (l: { scroll: number }) => void) => void;
      off: (e: string, cb: (l: { scroll: number }) => void) => void;
    } | null = null;
    let last: boolean | null = null;

    const readY = () => {
      const lenis = (window as Window & { __lenis?: { scroll: number } }).__lenis;
      if (typeof lenis?.scroll === "number") return lenis.scroll;
      return window.scrollY || document.documentElement.scrollTop || 0;
    };

    const apply = (raw?: number) => {
      const y = typeof raw === "number" ? raw : readY();
      const next = y > 0;
      if (last === next) return;
      last = next;
      setScrolled(next);
    };

    const onLenisScroll = (instance: { scroll: number }) => {
      apply(instance.scroll);
    };

    const onWindowScroll = () => apply();

    const attachLenis = () => {
      const lenis = (window as Window & {
        __lenis?: {
          on: (e: string, cb: (l: { scroll: number }) => void) => void;
          off: (e: string, cb: (l: { scroll: number }) => void) => void;
          scroll: number;
        };
      }).__lenis;
      if (!lenis?.on || attached) return Boolean(attached);
      lenis.on("scroll", onLenisScroll);
      attached = lenis;
      apply(lenis.scroll);
      return true;
    };

    window.addEventListener("scroll", onWindowScroll, { passive: true });
    window.addEventListener("jalyns:lenis-ready", attachLenis);
    attachLenis();
    apply();

    // Fallback poll — guarantees instant reaction even if events lag
    const poll = window.setInterval(() => {
      attachLenis();
      apply();
    }, 50);

    return () => {
      window.removeEventListener("scroll", onWindowScroll);
      window.removeEventListener("jalyns:lenis-ready", attachLenis);
      window.clearInterval(poll);
      attached?.off("scroll", onLenisScroll);
    };
  }, []);

  function requestSignOut() {
    setOpen(false);
    setConfirmSignOut(true);
  }

  async function handleConfirmSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      setConfirmSignOut(false);
      navigate("/", { replace: true });
    } finally {
      setSigningOut(false);
    }
  }

  const elevated = scrolled || open;

  return (
    <>
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[60]">
      <div
        className={`pointer-events-auto mx-auto transition-[margin,max-width,border-radius,background-color,backdrop-filter,border-color,box-shadow,padding] duration-200 ease-out ${
          elevated
            ? "mt-3 max-w-[min(100%-1.25rem,76rem)] rounded-[1.35rem] border border-white/15 bg-[#050b12]/88 px-4 py-2.5 shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:mt-4 sm:max-w-[min(100%-2rem,82rem)] sm:px-5 sm:py-3 md:px-6"
            : "mt-0 max-w-none rounded-none border border-transparent bg-transparent px-5 py-3.5 shadow-none backdrop-blur-0 sm:px-6 sm:py-4 md:px-8 lg:px-10 xl:px-12"
        }`}
      >
        <div className="relative z-50 flex items-center justify-between gap-3 sm:gap-4">
          <div className="relative z-10 min-w-0 shrink">
            <Link
              to="/"
              className="group block max-w-full text-white"
              onClick={() => setOpen(false)}
            >
              <span
                className={`font-script block leading-none transition-[font-size] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  elevated
                    ? "text-[1.85rem] sm:text-[2.15rem] md:text-[2.35rem]"
                    : "text-[2.15rem] sm:text-[2.85rem] md:text-[3.2rem] lg:text-[3.4rem]"
                }`}
              >
                Jalyn&apos;s
              </span>
              <span
                className={`mt-0.5 block truncate font-medium tracking-[0.18em] text-white/65 uppercase sm:tracking-[0.22em] ${
                  elevated
                    ? "text-[0.58rem] opacity-80 sm:text-[0.62rem]"
                    : "text-[0.62rem] sm:mt-1 sm:text-[0.72rem] md:text-[0.78rem]"
                }`}
              >
                Resort &amp; Restaurant
              </span>
            </Link>
            {showMember ? (
              <div className="mt-1.5 sm:mt-2">
                <span
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[0.68rem] text-white/80 backdrop-blur-md sm:text-[0.72rem]"
                  title={`${profile?.name ?? ""} · ${roleLabel(role)}`}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  <span className="truncate font-medium text-white">{profile?.name}</span>
                  <span className="shrink-0 text-white/35">·</span>
                  <span className="shrink-0 text-white/70">{roleLabel(role)}</span>
                </span>
              </div>
            ) : null}
          </div>

          <nav
            className={`absolute left-1/2 hidden -translate-x-1/2 items-center lg:flex ${
              elevated
                ? "gap-0.5 rounded-full border border-white/10 bg-white/[0.06] p-1 backdrop-blur-md"
                : "gap-1 xl:gap-1.5"
            }`}
            aria-label="Primary"
          >
            {links.map((link) => (
              <NavAnchor
                key={link.label}
                item={link}
                useShortLabel
                className={`nav-link shrink-0 whitespace-nowrap font-medium tracking-wide text-white/80 transition-colors hover:text-white ${
                  elevated
                    ? "rounded-full px-3.5 py-1.5 text-[0.82rem] hover:bg-white/10 xl:px-4 xl:text-[0.88rem]"
                    : "px-2 text-[0.95rem] xl:text-[1.05rem]"
                }`}
              />
            ))}
          </nav>

          <div className="relative z-10 flex shrink-0 items-center justify-end gap-2">
            {showMember ? (
              <div className="relative hidden items-center gap-2 sm:flex">
                <Link
                  to="/members"
                  className="btn-press inline-flex h-9 items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 text-[0.8rem] font-semibold text-white backdrop-blur-md transition hover:bg-white/16 sm:h-10 sm:px-5 sm:text-sm"
                >
                  Member
                </Link>
                <button
                  type="button"
                  onClick={requestSignOut}
                  className="btn-press inline-flex h-9 items-center justify-center rounded-full bg-white px-4 text-[0.8rem] font-semibold text-ink transition hover:bg-white/92 sm:h-10 sm:px-5 sm:text-sm"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <a
                href="/#book"
                className={`btn-press hidden items-center justify-center rounded-full font-semibold text-ink transition sm:inline-flex ${
                  elevated
                    ? "h-9 bg-white px-4 text-[0.8rem] hover:bg-white/92 sm:h-10 sm:px-5 sm:text-sm"
                    : "h-10 bg-white px-5 text-[0.88rem] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_28px_rgba(0,0,0,0.25)] hover:bg-white/92 xl:px-6"
                }`}
              >
                Book Now
              </a>
            )}
            <button
              type="button"
              className="btn-press inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/16 lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="flex w-[1.15rem] flex-col gap-[5px]">
                <span
                  className={`h-px w-full origin-center bg-white transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    open ? "translate-y-[6px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`h-px w-full bg-white transition duration-300 ${
                    open ? "scale-x-0 opacity-0" : ""
                  }`}
                />
                <span
                  className={`h-px w-full origin-center bg-white transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    open ? "-translate-y-[6px] -rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>

    {open
      ? createPortal(
          <div className="fixed inset-0 z-[55] lg:hidden" role="presentation">
            <button
              type="button"
              className="absolute inset-0 z-0 bg-[#03060c]/70 backdrop-blur-md"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <nav
              id="mobile-nav"
              className="absolute inset-x-3 top-[5.25rem] bottom-3 z-10 flex flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#071018] shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:inset-x-4 sm:top-[5.75rem] sm:bottom-4"
              aria-label="Mobile"
            >
              <div className="flex min-h-0 flex-1 flex-col px-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
                <p className="shrink-0 text-[0.62rem] font-semibold tracking-[0.32em] text-white/40 uppercase">
                  Explore
                </p>

                <ul className="mt-5 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain">
                  {links.map((link) => (
                    <li key={link.label}>
                      <NavAnchor
                        item={link}
                        className="btn-press flex items-center justify-between rounded-xl px-3 py-3.5 text-[1.35rem] font-medium tracking-wide text-white/90 transition hover:bg-white/8 hover:text-white"
                        onClick={() => setOpen(false)}
                      />
                    </li>
                  ))}
                </ul>

                <div className="mt-auto shrink-0 border-t border-white/10 pt-5">
                  {showMember ? (
                    <Link
                      to="/members"
                      onClick={() => setOpen(false)}
                      className="btn-press mb-2.5 inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-[0.92rem] font-semibold text-white transition hover:bg-white/16"
                    >
                      Member
                    </Link>
                  ) : null}

                  {showMember ? (
                    <button
                      type="button"
                      onClick={requestSignOut}
                      className="btn-press inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3.5 text-[0.92rem] font-semibold text-ink transition hover:bg-white/92"
                    >
                      Sign out
                    </button>
                  ) : (
                    <a
                      href="/#book"
                      onClick={() => setOpen(false)}
                      className="btn-press inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3.5 text-[0.92rem] font-semibold text-ink transition hover:bg-white/92"
                    >
                      Book Now
                    </a>
                  )}

                  <p className="mt-4 text-center text-[0.7rem] tracking-[0.16em] text-white/40 uppercase">
                    Mangrove Cove · Puerto Galera
                  </p>
                </div>
              </div>
            </nav>
          </div>,
          document.body,
        )
      : null}

    {confirmSignOut
      ? createPortal(
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="sign-out-title"
              className="w-full max-w-md rounded-2xl border border-ink/8 bg-white p-5 text-ink shadow-xl sm:p-6"
            >
              <h2 id="sign-out-title" className="font-display text-2xl">
                Sign out?
              </h2>
              <p className="mt-2 text-sm text-stone">
                Are you sure you want to sign out
                {profile?.name ? (
                  <>
                    {" "}
                    as <strong className="text-ink">{profile.name}</strong>
                  </>
                ) : null}
                ?
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={() => setConfirmSignOut(false)}
                  className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={() => void handleConfirmSignOut()}
                  className="btn-press rounded-full bg-sky px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-bright disabled:opacity-60"
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null}
    </>
  );
}
