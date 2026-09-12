import { useState } from "react";

const links = [
  { label: "Home", href: "#home" },
  { label: "Rooms", href: "#rooms" },
  { label: "Restaurant", href: "#restaurant" },
  { label: "Diving", href: "#diving" },
  { label: "Gallery", href: "#gallery" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="absolute inset-x-0 top-0 z-40 animate-fade-in">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3.5 sm:px-6 sm:py-4 md:px-8 lg:px-10">
        <a href="#home" className="min-w-0 text-white">
          <span className="font-script block text-[1.55rem] leading-none sm:text-[2rem]">
            Jalyn&apos;s
          </span>
          <span className="mt-0.5 block truncate text-[0.5rem] font-medium tracking-[0.18em] text-white/75 uppercase sm:text-[0.55rem] sm:tracking-[0.22em]">
            Resort &amp; Restaurant
          </span>
        </a>

        <nav className="hidden items-center gap-8 lg:flex xl:gap-10" aria-label="Primary">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[1.05rem] font-medium tracking-wide text-white/85 transition hover:text-white xl:text-[1.125rem]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href="#book"
            className="animate-pulse-glow hidden rounded-full bg-white px-6 py-2.5 text-[0.95rem] font-semibold text-ink transition hover:bg-white/90 sm:inline-flex xl:px-7 xl:py-3 xl:text-base"
          >
            Book Now
          </a>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="flex w-5 flex-col gap-[5px]">
              <span className={`h-px w-full bg-white transition ${open ? "translate-y-[6px] rotate-45" : ""}`} />
              <span className={`h-px w-full bg-white transition ${open ? "opacity-0" : ""}`} />
              <span className={`h-px w-full bg-white transition ${open ? "-translate-y-[6px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          className="border-t border-white/10 bg-ink/95 px-5 py-3 backdrop-blur-xl sm:px-6 lg:hidden"
          aria-label="Mobile"
        >
          <ul className="grid grid-cols-2 gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block rounded-lg px-3 py-2.5 text-base font-medium text-white/90"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
