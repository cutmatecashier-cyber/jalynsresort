import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  { label: "News, Offers and Events", shortLabel: "News", kind: "route", to: "/news" },
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
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(64);
  const headerBarRef = useRef<HTMLDivElement>(null);
  const { role, approvalStatus, can, signOut, profile } = useAuth();
  const showMember = can.canManageMembers(role, approvalStatus);

  // News detail / members start on light backgrounds — keep a solid bar so white text stays readable.
  const forceSolid =
    /^\/news\/[^/]+/.test(location.pathname) || location.pathname.startsWith("/members");

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
      const next = y > 16;
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

  /** Solid bar when scrolled, mobile menu open, or on light-top pages */
  const solid = scrolled || open || forceSolid;

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--jalyns-header-height",
      `${headerHeight}px`,
    );
  }, [headerHeight]);

  useEffect(() => {
    const node = headerBarRef.current;
    if (!node) return;

    const measure = () => {
      const h = Math.ceil(node.getBoundingClientRect().height);
      if (h > 0) setHeaderHeight(h);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [solid, showMember, open, forceSolid]);

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

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-[60]">
        <div
          ref={headerBarRef}
          className={`pointer-events-auto w-full border-b transition-[background-color,border-color,box-shadow,backdrop-filter,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            solid
              ? "border-white/10 bg-[#050b12]/92 shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-xl"
              : "border-transparent bg-transparent shadow-none backdrop-blur-0"
          }`}
        >
          <div
            className={`mx-auto flex max-w-[90rem] items-center justify-between gap-3 px-4 transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-6 md:px-8 lg:px-10 xl:px-12 ${
              solid ? "py-2 sm:py-2.5" : "py-3 sm:py-3.5 md:py-4"
            }`}
          >
            {/* Brand */}
            <div className="relative z-10 min-w-0 shrink">
              <Link
                to="/"
                className="group block max-w-full text-white"
                onClick={() => setOpen(false)}
              >
                <span
                  className={`font-script block leading-none transition-[font-size] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    solid
                      ? "text-[1.55rem] sm:text-[1.75rem] md:text-[1.9rem]"
                      : "text-[1.85rem] sm:text-[2.25rem] md:text-[2.55rem] lg:text-[2.75rem]"
                  }`}
                >
                  Jalyn&apos;s
                </span>
                <span
                  className={`mt-0.5 block truncate font-medium tracking-[0.16em] text-white/65 uppercase transition-[font-size,opacity] duration-300 sm:tracking-[0.2em] ${
                    solid
                      ? "text-[0.55rem] opacity-75 sm:text-[0.58rem]"
                      : "text-[0.58rem] sm:text-[0.65rem] md:text-[0.7rem]"
                  }`}
                >
                  Resort &amp; Restaurant
                </span>
              </Link>
              {showMember ? (
                <span
                  className={`mt-1 inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-black/45 px-2 py-0.5 text-white shadow-sm ring-1 ring-white/15 transition-[margin,font-size] duration-300 ${
                    solid ? "text-[0.6rem] sm:text-[0.62rem]" : "text-[0.62rem] sm:text-[0.68rem]"
                  }`}
                  title={`${profile?.name ?? ""} · ${roleLabel(role)}`}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  <span className="truncate font-medium text-white">{profile?.name}</span>
                  <span className="shrink-0 text-white/40">·</span>
                  <span className="shrink-0 text-white/80">{roleLabel(role)}</span>
                </span>
              ) : null}
            </div>

            {/* Desktop nav — centered */}
            <nav
              className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 lg:flex xl:gap-1"
              aria-label="Primary"
            >
              {links.map((link) => (
                <NavAnchor
                  key={link.label}
                  item={link}
                  useShortLabel
                  className={`nav-link shrink-0 whitespace-nowrap font-medium tracking-wide text-white/80 transition-colors hover:text-white ${
                    solid
                      ? "px-2.5 py-1 text-[0.8rem] xl:px-3 xl:text-[0.85rem]"
                      : "px-2.5 py-1 text-[0.88rem] xl:px-3 xl:text-[0.95rem]"
                  }`}
                />
              ))}
            </nav>

            {/* Desktop actions + mobile toggle */}
            <div className="relative z-10 flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
              {showMember ? (
                <div className="relative hidden items-center gap-1.5 lg:flex">
                  <Link
                    to="/members"
                    className={`btn-press inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 font-semibold text-white transition hover:bg-white/16 ${
                      solid
                        ? "h-8 px-3.5 text-[0.75rem]"
                        : "h-9 px-4 text-[0.8rem]"
                    }`}
                  >
                    Member
                  </Link>
                  <button
                    type="button"
                    onClick={requestSignOut}
                    className={`btn-press inline-flex items-center justify-center rounded-full bg-white font-semibold text-ink transition hover:bg-white/92 ${
                      solid
                        ? "h-8 px-3.5 text-[0.75rem]"
                        : "h-9 px-4 text-[0.8rem]"
                    }`}
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <a
                  href="/#book"
                  className={`btn-press hidden items-center justify-center rounded-full bg-white font-semibold text-ink transition hover:bg-white/92 lg:inline-flex ${
                    solid
                      ? "h-8 px-3.5 text-[0.75rem]"
                      : "h-9 px-4 text-[0.8rem] shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
                  }`}
                >
                  Book Now
                </a>
              )}

              <button
                type="button"
                className={`btn-press inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/16 lg:hidden ${
                  solid ? "h-9 w-9" : "h-10 w-10"
                }`}
                aria-expanded={open}
                aria-controls="mobile-nav"
                aria-label={open ? "Close menu" : "Open menu"}
                onClick={() => setOpen((v) => !v)}
              >
                <span className="flex w-[1.1rem] flex-col gap-[4.5px]">
                  <span
                    className={`h-px w-full origin-center bg-white transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      open ? "translate-y-[5.5px] rotate-45" : ""
                    }`}
                  />
                  <span
                    className={`h-px w-full bg-white transition duration-300 ${
                      open ? "scale-x-0 opacity-0" : ""
                    }`}
                  />
                  <span
                    className={`h-px w-full origin-center bg-white transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      open ? "-translate-y-[5.5px] -rotate-45" : ""
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
                className="absolute inset-0 z-0 bg-[#03060c]/75 backdrop-blur-sm"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              />
              <nav
                id="mobile-nav"
                className="absolute inset-x-0 bottom-0 z-10 flex flex-col overflow-x-hidden overflow-y-hidden border-t border-white/10 bg-[#071018]/98 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                style={{ top: headerHeight }}
                aria-label="Mobile"
              >
                <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-5">
                  <p className="shrink-0 text-[0.62rem] font-semibold tracking-[0.28em] text-white/40 uppercase">
                    Explore
                  </p>

                  <ul className="mt-3 min-h-0 flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto overscroll-contain">
                    {links.map((link) => (
                      <li key={link.label} className="min-w-0">
                        <NavAnchor
                          item={link}
                          className="btn-press flex min-h-12 min-w-0 items-center rounded-xl px-3 py-3 text-[1.1rem] font-medium tracking-wide text-white/90 transition hover:bg-white/8 hover:text-white sm:text-[1.2rem]"
                          onClick={() => setOpen(false)}
                        />
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto shrink-0 space-y-2.5 border-t border-white/10 pt-4">
                    {showMember ? (
                      <>
                        <Link
                          to="/members"
                          onClick={() => setOpen(false)}
                          className="btn-press inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 text-[0.9rem] font-semibold text-white transition hover:bg-white/16"
                        >
                          Member
                        </Link>
                        <button
                          type="button"
                          onClick={requestSignOut}
                          className="btn-press inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-6 text-[0.9rem] font-semibold text-ink transition hover:bg-white/92"
                        >
                          Sign out
                        </button>
                      </>
                    ) : (
                      <a
                        href="/#book"
                        onClick={() => setOpen(false)}
                        className="btn-press inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-6 text-[0.9rem] font-semibold text-ink transition hover:bg-white/92"
                      >
                        Book Now
                      </a>
                    )}

                    <p className="pt-1 text-center text-[0.65rem] tracking-[0.16em] text-white/35 uppercase">
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
