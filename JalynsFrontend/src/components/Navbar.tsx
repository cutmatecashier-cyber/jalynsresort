import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { label: "Home", href: "#home" },
  { label: "Rooms and Apartments", href: "#rooms" },
  { label: "Restaurant", href: "#restaurant" },
  { label: "Scuba Diving", href: "#diving" },
  { label: "SPA", href: "#spa" },
  { label: "News, Offers and Events", href: "#news" },
  { label: "Contact Us", href: "#contact" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { role, approvalStatus, can } = useAuth();
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

  return (
    <header className="absolute inset-x-0 top-0 z-40 animate-fade-in">
      <div className="relative z-50 flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6 sm:py-4 md:px-8 lg:px-10 xl:px-12">
        <a
          href="#home"
          className="relative z-10 min-w-0 shrink-0 text-white lg:w-[11rem] xl:w-[13rem]"
          onClick={() => setOpen(false)}
        >
          <span className="font-script block text-[2.15rem] leading-none sm:text-[2.85rem] md:text-[3.4rem] lg:text-[3.5rem] xl:text-[4rem]">
            Jalyn&apos;s
          </span>
          <span className="mt-1 block text-[0.62rem] font-medium tracking-[0.2em] text-white/75 uppercase sm:mt-1.5 sm:text-[0.78rem] sm:tracking-[0.26em] md:text-[0.88rem] lg:text-[0.9rem] lg:tracking-[0.26em]">
            Resort &amp; Restaurant
          </span>
        </a>

        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-4 lg:flex xl:gap-5"
          aria-label="Primary"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="shrink-0 whitespace-nowrap text-[0.92rem] font-medium tracking-wide text-white/85 transition hover:text-white xl:text-[1.05rem]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="relative z-10 flex shrink-0 items-center justify-end gap-2 lg:w-[11rem] xl:w-[13rem]">
          {showMember ? (
            <Link
              to="/members"
              className="inline-flex rounded-full bg-sky px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-bright sm:px-5"
            >
              Member
            </Link>
          ) : null}
          <a
            href="#book"
            className="btn-press animate-pulse-glow hidden rounded-full bg-white px-5 py-2.5 text-[0.9rem] font-semibold text-ink transition hover:bg-white/90 sm:inline-flex xl:px-6 xl:text-[0.95rem]"
          >
            Book Now
          </a>
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
                <li key={link.href} className="border-b border-white/8 last:border-b-0">
                  <a
                    href={link.href}
                    className="btn-press flex items-center py-4 text-[1.45rem] font-medium tracking-wide text-white/90 transition hover:text-white"
                    style={{ transitionDelay: open ? `${index * 30}ms` : "0ms" }}
                    onClick={() => setOpen(false)}
                  >
                    <span className="whitespace-nowrap">{link.label}</span>
                  </a>
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

              <a
                href="#book"
                onClick={() => setOpen(false)}
                className="btn-press inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3.5 text-[0.95rem] font-semibold text-ink transition hover:bg-white/90"
              >
                Book Now
              </a>

              <p className="mt-4 text-center text-[0.72rem] tracking-wide text-white/45">
                Mangrove Cove, Puerto Galera
              </p>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
