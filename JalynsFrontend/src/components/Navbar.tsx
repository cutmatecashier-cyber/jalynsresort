import { useEffect, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { roleLabel } from "../lib/permissions";

type NavItem =
  | { label: string; shortLabel: string; kind: "hash"; hash: string }
  | { label: string; shortLabel: string; kind: "route"; to: string };

const links: NavItem[] = [
  { label: "Home", shortLabel: "Home", kind: "hash", hash: "#home" },
  { label: "Rooms and Apartments", shortLabel: "Rooms", kind: "hash", hash: "#rooms" },
  { label: "Restaurant", shortLabel: "Restaurant", kind: "hash", hash: "#restaurant" },
  { label: "Scuba Diving", shortLabel: "Scuba Diving", kind: "hash", hash: "#diving" },
  { label: "SPA", shortLabel: "SPA", kind: "hash", hash: "#spa" },
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
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { role, approvalStatus, can, signOut, profile } = useAuth();
  const showMember = can.canManageMembers(role, approvalStatus);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
    <header className="absolute inset-x-0 top-0 z-40 animate-fade-in">
      <div className="relative z-50 flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6 sm:py-4 md:px-8 lg:px-10 xl:px-12">
        <div className="relative z-10 min-w-0 shrink-0 lg:min-w-[13rem] xl:min-w-[15rem]">
          <Link to="/" className="block text-white" onClick={() => setOpen(false)}>
            <span className="font-script block text-[2.15rem] leading-none sm:text-[2.85rem] md:text-[3.4rem] lg:text-[3.5rem] xl:text-[4rem]">
              Jalyn&apos;s
            </span>
            <span className="mt-1 block whitespace-nowrap text-[0.62rem] font-medium tracking-[0.2em] text-white/75 uppercase sm:mt-1.5 sm:text-[0.78rem] sm:tracking-[0.26em] md:text-[0.88rem] lg:text-[0.9rem] lg:tracking-[0.26em]">
              Resort &amp; Restaurant
            </span>
          </Link>
          {showMember ? (
            <p className="mt-1.5 whitespace-nowrap text-[0.7rem] leading-tight text-white/85 sm:mt-2 sm:text-[0.75rem] xl:text-[0.8rem]">
              Signed in as <span className="font-semibold text-white">{profile?.name}</span>
              <span className="text-white/50"> · </span>
              <span className="font-medium text-white">{roleLabel(role)}</span>
            </p>
          ) : null}
        </div>

        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-4 lg:flex xl:gap-5"
          aria-label="Primary"
        >
          {links.map((link) => (
            <NavAnchor
              key={link.label}
              item={link}
              useShortLabel
              className="nav-link shrink-0 whitespace-nowrap text-[1.12rem] font-medium tracking-wide text-white/85 hover:text-white xl:text-[1.22rem]"
            />
          ))}
        </nav>

        <div className="relative z-10 flex shrink-0 items-center justify-end gap-2 lg:min-w-[11rem] xl:min-w-[13rem]">
          {showMember ? (
            <>
              <div className="relative hidden items-center gap-2 sm:flex">
                <Link
                  to="/members"
                  className="btn-press inline-flex h-10 min-w-[7.5rem] items-center justify-center rounded-full bg-sky px-4 text-sm font-semibold text-white transition hover:bg-sky-bright"
                >
                  Member
                </Link>
                <button
                  type="button"
                  onClick={requestSignOut}
                  className="btn-press inline-flex h-10 min-w-[7.5rem] items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-ink transition hover:bg-white/90"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <a
              href="/#book"
              className="btn-press animate-pulse-glow hidden h-10 items-center justify-center rounded-full bg-white px-5 text-[0.9rem] font-semibold text-ink transition hover:bg-white/90 sm:inline-flex xl:px-6 xl:text-[0.95rem]"
            >
              Book Now
            </a>
          )}
          <button
            type="button"
            className="btn-press inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/15 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="flex w-5 flex-col gap-[5px]">
              <span
                className={`h-px w-full bg-white transition duration-300 ${
                  open ? "translate-y-[6px] rotate-45" : ""
                }`}
              />
              <span
                className={`h-px w-full bg-white transition duration-300 ${
                  open ? "opacity-0" : ""
                }`}
              />
              <span
                className={`h-px w-full bg-white transition duration-300 ${
                  open ? "-translate-y-[6px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-40 lg:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <nav
          id="mobile-nav"
          className={`absolute inset-0 flex h-[100dvh] min-h-[100svh] flex-col bg-[#05080f] px-5 pt-[5.75rem] pb-[max(1.25rem,env(safe-area-inset-bottom))] transition duration-300 sm:px-6 ${
            open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
          aria-label="Mobile"
        >
          <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col">
            <p className="shrink-0 text-[0.65rem] font-medium tracking-[0.28em] text-white/45 uppercase">
              Explore
            </p>

            <ul className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {links.map((link, index) => (
                <li key={link.label} className="border-b border-white/8 last:border-b-0">
                  <NavAnchor
                    item={link}
                    className="btn-press flex items-center py-4 text-[1.45rem] font-medium tracking-wide text-white/90 transition hover:text-white"
                    style={{ transitionDelay: open ? `${index * 30}ms` : "0ms" }}
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
                  className="btn-press mb-3 inline-flex w-full items-center justify-center rounded-full bg-sky px-6 py-3.5 text-[0.95rem] font-semibold text-white transition hover:bg-sky-bright"
                >
                  Member
                </Link>
              ) : null}

              {showMember ? (
                <button
                  type="button"
                  onClick={requestSignOut}
                  className="btn-press inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3.5 text-[0.95rem] font-semibold text-ink transition hover:bg-white/90"
                >
                  Sign out
                </button>
              ) : (
                <a
                  href="/#book"
                  onClick={() => setOpen(false)}
                  className="btn-press inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3.5 text-[0.95rem] font-semibold text-ink transition hover:bg-white/90"
                >
                  Book Now
                </a>
              )}

              <p className="mt-4 text-center text-[0.72rem] tracking-wide text-white/45">
                Mangrove Cove, Puerto Galera
              </p>
            </div>
          </div>
        </nav>
      </div>

      {confirmSignOut ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sign-out-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 text-ink shadow-xl sm:p-6"
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
        </div>
      ) : null}
    </header>
  );
}
