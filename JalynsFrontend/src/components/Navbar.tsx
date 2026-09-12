import { useState } from "react";

const links = [
  { label: "Home", href: "#home" },
  { label: "Rooms", href: "#rooms" },
  { label: "Restaurant", href: "#restaurant" },
  { label: "Diving", href: "#diving" },
  { label: "Gallery", href: "#gallery" },
  { label: "News", href: "#news" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="absolute inset-x-0 top-0 z-30 animate-fade-in">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 md:px-8 lg:px-10">
        <a href="#home" className="group shrink-0 text-white">
          <span className="font-script block text-[2rem] leading-none tracking-wide md:text-[2.35rem]">
            Jalyn&apos;s
          </span>
          <span className="mt-0.5 block text-[0.62rem] font-medium uppercase tracking-[0.22em] text-white/85">
            Resort &amp; Restaurant
          </span>
          <span className="block text-[0.55rem] font-medium uppercase tracking-[0.28em] text-white/65">
            Puerto Galera
          </span>
        </a>

        <nav className="hidden items-center gap-6 lg:flex xl:gap-8" aria-label="Primary">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[0.82rem] font-medium tracking-wide text-white/90 transition hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#book"
            className="rounded-full bg-ink px-5 py-2.5 text-[0.8rem] font-semibold tracking-wide text-white transition hover:bg-ink-soft"
          >
            Book Now
          </a>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center text-white lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">Menu</span>
            <span className="flex w-5 flex-col gap-1.5">
              <span
                className={`h-0.5 w-full bg-white transition ${open ? "translate-y-2 rotate-45" : ""}`}
              />
              <span className={`h-0.5 w-full bg-white transition ${open ? "opacity-0" : ""}`} />
              <span
                className={`h-0.5 w-full bg-white transition ${open ? "-translate-y-2 -rotate-45" : ""}`}
              />
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          className="border-t border-white/15 bg-ink/90 px-5 py-4 backdrop-blur-md lg:hidden"
          aria-label="Mobile"
        >
          <ul className="flex flex-col gap-3">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block py-1 text-sm font-medium text-white/90"
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
