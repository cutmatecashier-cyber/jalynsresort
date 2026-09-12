import { type FormEvent, useState } from "react";
import { Reveal } from "./Reveal";

const links = [
  { label: "Rooms", href: "#rooms" },
  { label: "Restaurant", href: "#restaurant" },
  { label: "Diving", href: "#diving" },
  { label: "Gallery", href: "#gallery" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
] as const;

export function Footer() {
  const [email, setEmail] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmail("");
  }

  return (
    <footer id="contact" className="bg-ink text-white">
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-16 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_1fr] lg:gap-14">
          <Reveal variant="up">
            <a href="#home" className="inline-block">
              <span className="font-script block text-[2rem] leading-none">Jalyn&apos;s</span>
              <span className="mt-1 block text-[0.6rem] font-medium tracking-[0.28em] text-white/45 uppercase">
                Resort &amp; Restaurant
              </span>
            </a>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/50">
              Mangrove Cove, Puerto Galera
              <br />
              Oriental Mindoro, Philippines
            </p>
            <div className="mt-5 space-y-1.5 text-sm text-white/55">
              <a href="tel:+639171234567" className="block transition hover:text-white">
                +63 917 123 4567
              </a>
              <a href="mailto:hello@jalynsresort.com" className="block transition hover:text-white">
                hello@jalynsresort.com
              </a>
            </div>
          </Reveal>

          <Reveal delay={100} variant="up">
            <h3 className="text-[0.65rem] font-semibold tracking-[0.22em] text-white/35 uppercase">
              Navigate
            </h3>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-white/60">
              {links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="transition hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={200} variant="up">
            <h3 className="text-[0.65rem] font-semibold tracking-[0.22em] text-white/35 uppercase">
              Newsletter
            </h3>
            <p className="mt-4 text-sm text-white/50">Seasonal offers and cove updates.</p>
            <form
              onSubmit={onSubmit}
              className="mt-4 flex items-center border-b border-white/15 pb-2"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-white/30"
              />
              <button
                type="submit"
                className="text-sm font-semibold text-white/80 transition hover:text-white"
              >
                Join
              </button>
            </form>

            <div className="mt-6 flex gap-4 text-[0.75rem] font-medium tracking-wide text-white/40">
              <a href="#contact" className="transition hover:text-white/70">
                Facebook
              </a>
              <a href="#contact" className="transition hover:text-white/70">
                Instagram
              </a>
              <a href="#contact" className="transition hover:text-white/70">
                YouTube
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={280} variant="in" className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-[0.7rem] text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Jalyn&apos;s Resort &amp; Restaurant</p>
          <div className="flex gap-4">
            <a href="#contact" className="hover:text-white/55">
              Privacy
            </a>
            <a href="#contact" className="hover:text-white/55">
              Terms
            </a>
          </div>
        </Reveal>
      </div>
    </footer>
  );
}
