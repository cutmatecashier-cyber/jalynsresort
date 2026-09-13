import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type NavItem =
  | { label: string; kind: "hash"; hash: string }
  | { label: string; kind: "route"; to: string };

const links: NavItem[] = [
  { label: "Home", kind: "hash", hash: "#home" },
  { label: "Rooms", kind: "hash", hash: "#rooms" },
  { label: "Restaurant", kind: "hash", hash: "#restaurant" },
  { label: "Diving", kind: "hash", hash: "#diving" },
  { label: "Gallery", kind: "hash", hash: "#gallery" },
  { label: "About", kind: "hash", hash: "#about" },
  { label: "Contact", kind: "route", to: "/contact" },
];

function NavAnchor({
  item,
  className,
  onClick,
  style,
}: {
  item: NavItem;
  className: string;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  if (item.kind === "route") {
    return (
      <Link to={item.to} className={className} onClick={onClick} style={style}>
        {item.label}
      </Link>
    );
  }
  return (
    <a href={`/${item.hash}`} className={className} onClick={onClick} style={style}>
      {item.label}
    </a>
  );
}

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
        <Link
          to="/"
          className="min-w-0 shrink-0 text-white lg:w-[16rem] xl:w-[18rem]"
          onClick={() => setOpen(false)}
        >
          <span className="font-script block text-[2.15rem] leading-none sm:text-[2.85rem] md:text-[3.4rem] lg:text-[3.9rem] xl:text-[4.25rem]">
            Jalyn&apos;s
          </span>
          <span className="mt-1 block text-[0.62rem] font-medium tracking-[0.2em] text-white/75 uppercase sm:mt-1.5 sm:text-[0.78rem] sm:tracking-[0.26em] md:text-[0.88rem] lg:text-[0.95rem] lg:tracking-[0.28em]">
            Resort &amp; Restaurant
          </span>
        </Link>

        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex xl:gap-10"
          aria-label="Primary"
        >
          {links.map((link) => (
            <NavAnchor
              key={link.label}
              item={link}
              className="text-[1.05rem] font-medium tracking-wide text-white/85 transition hover:text-white xl:text-[1.125rem]"
            />
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 lg:w-[16rem] lg:justify-end xl:w-[18rem]">
          {showMember ? (
            <Link
              to="/members"
              className="inline-flex rounded-full bg-sky px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-bright sm:px-5"
            >
              Member
            </Link>
          ) : null}
          <a
            href="/#book"
            className="btn-press animate-pulse-glow hidden rounded-full bg-white px-6 py-2.5 text-[0.95rem] font-semibold text-ink transition hover:bg-white/90 sm:inline-flex xl:px-7 xl:py-3 xl:text-base"
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
        <button
          type="button"
          className={`absolute inset-0 bg-ink/55 backdrop-blur-sm transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Close menu"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
        />

        <nav
          id="mobile-nav"
          className={`absolute inset-x-0 top-0 origin-top border-b border-white/10 bg-ink/96 px-5 pt-[5.75rem] pb-7 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition duration-300 sm:px-6 ${
            open ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
          }`}
          aria-label="Mobile"
        >
          <div className="mx-auto max-w-7xl">
            <p className="text-[0.65rem] font-medium tracking-[0.28em] text-white/45 uppercase">
              Explore
            </p>

            <ul className="mt-4 flex flex-col">
              {links.map((link, index) => (
                <li key={link.label} className="border-b border-white/8 last:border-b-0">
                  <NavAnchor
                    item={link}
                    className="btn-press group flex items-center justify-between py-3.5 text-[1.35rem] font-medium tracking-wide text-white/90 transition hover:text-white"
                    style={{ transitionDelay: open ? `${index * 30}ms` : "0ms" }}
                    onClick={() => setOpen(false)}
                  />
                </li>
              ))}
            </ul>

            {showMember ? (
              <Link
                to="/members"
                onClick={() => setOpen(false)}
                className="btn-press mt-4 inline-flex w-full items-center justify-center rounded-full bg-sky px-6 py-3.5 text-[0.95rem] font-semibold text-white transition hover:bg-sky-bright"
              >
                Member
              </Link>
            ) : null}

            <a
              href="/#book"
              onClick={() => setOpen(false)}
              className="btn-press mt-6 inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3.5 text-[0.95rem] font-semibold text-ink transition hover:bg-white/90"
            >
              Book Now
            </a>

            <p className="mt-4 text-center text-[0.72rem] tracking-wide text-white/45">
              Mangrove Cove, Puerto Galera
            </p>
          </div>
        </nav>
      </div>
    </header>
  );
}
