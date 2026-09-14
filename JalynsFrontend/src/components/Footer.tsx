import { Reveal } from "./Reveal";

const shareLinks = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/sharer/sharer.php?u=",
    icon: FacebookIcon,
  },
  {
    label: "X (Twitter)",
    href: "https://twitter.com/intent/tweet?url=",
    icon: XIcon,
  },
  {
    label: "Pinterest",
    href: "https://pinterest.com/pin/create/button/?url=",
    icon: PinterestIcon,
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/?text=",
    icon: WhatsAppIcon,
  },
] as const;

const featureLinks = [
  {
    eyebrow: "Follow Us",
    title: "Facebook",
    href: "https://www.facebook.com/jalynsresortpuertogalera",
    logo: (
      <img
        src="/images/facebook-logo.png"
        alt=""
        className="h-9 w-9 rounded-full object-cover md:h-14 md:w-14"
      />
    ),
  },
  {
    eyebrow: "Marine Conservation",
    title: "Blue Alliance",
    href: "https://www.facebook.com/BlueAlliancePhilippines",
    logo: (
      <img
        src="/images/blue-alliance-logo.png"
        alt=""
        className="h-9 w-auto max-w-[3rem] object-contain md:h-14 md:max-w-[5rem]"
      />
    ),
  },
  {
    eyebrow: "Kayak Awards",
    title: "Travel Awards",
    href: "https://www.kayak.com.au/Puerto-Galera-Hotels-Jalyn-s-Resort.3546958.ksp",
    logo: (
      <img
        src="/images/kayak-travel-awards-logo.png"
        alt=""
        className="h-9 w-auto max-w-[3.25rem] object-contain md:h-14 md:max-w-[5.5rem]"
      />
    ),
  },
  {
    eyebrow: "Restaurant",
    title: "Jalyn's Resort & Restaurant",
    href: "https://restaurantguru.com/Jalyns-Restaurant-Puerto-Galera",
    logo: (
      <div className="flex h-9 w-9 flex-col items-center justify-center rounded-full border border-white/70 bg-white text-center text-[#1a1a1a] md:h-14 md:w-14">
        <span className="text-[0.28rem] font-bold leading-none uppercase md:text-[0.42rem]">
          ★ Guru
        </span>
        <span className="mt-0.5 bg-[#d62828] px-1 text-[0.24rem] font-bold text-white uppercase md:mt-1 md:px-1.5 md:text-[0.36rem]">
          Rec
        </span>
      </div>
    ),
  },
] as const;

function FacebookIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H8v3h3v7h3v-7h3l1-3h-4V9c0-.6.4-1 1-1Z" />
    </svg>
  );
}

function XIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.5 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.3l4.4 5.8L17.5 3Zm-1.1 16.2h1.7L7.7 4.7H5.9l10.5 14.5Z" />
    </svg>
  );
}

function PinterestIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.5 2 2 6.5 2 12c0 4.2 2.6 7.8 6.3 9.2-.1-.8-.2-2 0-2.9.2-.8 1.3-5.4 1.3-5.4s-.3-.7-.3-1.6c0-1.5.9-2.6 2-2.6.9 0 1.4.7 1.4 1.5 0 .9-.6 2.3-.9 3.5-.3 1.1.5 1.9 1.5 1.9 1.8 0 3.2-1.9 3.2-4.7 0-2.4-1.8-4.2-4.3-4.2-2.9 0-4.6 2.2-4.6 4.4 0 .9.3 1.8.8 2.3.1.1.1.2.1.3l-.3 1.2c0 .2-.1.2-.3.1-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.8-6.3 3.6 0 6.4 2.6 6.4 5.9 0 3.6-2.2 6.4-5.4 6.4-1.1 0-2-.5-2.4-1.2l-.6 2.5c-.2.9-.8 2-1.2 2.7 1 .3 2 .5 3.1.5 5.5 0 10-4.5 10-10S17.5 2 12 2Z" />
    </svg>
  );
}

function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.1 4.9A9.9 9.9 0 0 0 12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.4A9.9 9.9 0 0 0 12 22c5.5 0 10-4.5 10-10 0-2.7-1.1-5.1-2.9-7.1ZM12 20.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.1 8.1 0 0 1 3.8 12c0-4.5 3.7-8.2 8.2-8.2 2.2 0 4.2.9 5.7 2.3A8.1 8.1 0 0 1 20.2 12c0 4.5-3.7 8.2-8.2 8.2Zm4.5-6.1c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.7.9-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.5c.1-.1.2-.3.2-.4 0-.1 0-.3-.1-.4-.1-.1-.5-1.3-.7-1.8-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 3.9 3.4.5.2 1 .4 1.3.5.6.2 1.1.1 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1-.1-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}

function PinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function PhoneIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.5 3.8h3.2l1 4.2-2 1.2a12.5 12.5 0 0 0 5.1 5.1l1.2-2 4.2 1v3.2c0 .9-.7 1.6-1.6 1.6A15.7 15.7 0 0 1 3.9 5.4c0-.9.7-1.6 1.6-1.6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="m4.5 7.5 7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function shareUrl(base: string) {
  if (typeof window === "undefined") return base;
  const page = encodeURIComponent(window.location.href);
  const title = encodeURIComponent("Jalyn's Resort & Restaurant");
  if (base.includes("wa.me")) return `${base}${title}%20${page}`;
  return `${base}${page}`;
}

export function Footer() {
  return (
    <footer id="contact" className="relative overflow-hidden bg-[#0a0c10] text-white">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.06),transparent_70%)]" />

      <div className="relative w-full px-5 py-8 sm:px-6 md:px-8 md:py-12 lg:px-10 xl:px-12">
        {/* Share */}
        <Reveal className="text-center">
          <div className="flex items-center gap-2.5">
            <span className="h-px flex-1 bg-white/15" />
            <p className="shrink-0 text-[0.65rem] font-semibold tracking-[0.2em] text-white/70 uppercase">
              Share this page!
            </p>
            <span className="h-px flex-1 bg-white/15" />
          </div>

          <div className="mt-3.5 flex items-start justify-center gap-5 sm:gap-7">
            {shareLinks.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(event) => {
                    event.preventDefault();
                    window.open(shareUrl(item.href), "_blank", "noopener,noreferrer");
                  }}
                  className="btn-press group flex flex-col items-center gap-1.5"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#15181f] text-white/90 transition group-hover:border-white/20 group-hover:bg-[#1b1f28] group-hover:text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-center text-[0.62rem] leading-tight text-white/65">
                    {item.label}
                  </span>
                </a>
              );
            })}
          </div>
        </Reveal>

        {/* Contact */}
        <Reveal delay={80} className="mt-7 md:mt-8">
          <div className="flex items-center gap-2.5">
            <span className="h-px flex-1 bg-white/15" />
            <h3 className="shrink-0 text-[0.65rem] font-semibold tracking-[0.2em] text-white/70 uppercase">
              Contact Us
            </h3>
            <span className="h-px flex-1 bg-white/15" />
          </div>

          <ul className="mt-4 grid grid-cols-3 sm:mx-auto sm:max-w-2xl">
            <li className="px-2 sm:px-4">
              <a
                href="https://maps.google.com/?q=Jalyn's+Resort+Puerto+Galera"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-1.5 text-center"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#15181f] text-white/90 transition group-hover:border-white/20 group-hover:bg-[#1b1f28] group-hover:text-white">
                  <PinIcon className="h-4 w-4" />
                </span>
                <span className="text-[0.62rem] font-semibold tracking-wide text-white uppercase">
                  Location
                </span>
                <span className="max-w-[7.5rem] text-[0.7rem] leading-snug text-white/85 sm:max-w-[9rem] sm:text-[0.75rem]">
                  Western Nautical Hwy, Puerto Galera
                </span>
              </a>
            </li>
            <li className="border-x border-white/15 px-2 sm:px-4">
              <a
                href="tel:+639476197535"
                className="group flex flex-col items-center gap-1.5 text-center"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#15181f] text-white/90 transition group-hover:border-white/20 group-hover:bg-[#1b1f28] group-hover:text-white">
                  <PhoneIcon className="h-4 w-4" />
                </span>
                <span className="text-[0.62rem] font-semibold tracking-wide text-white uppercase">
                  Call Us
                </span>
                <span className="text-[0.7rem] leading-snug text-white/85 sm:text-[0.75rem]">
                  +63 947 619 7535
                </span>
              </a>
            </li>
            <li className="px-2 sm:px-4">
              <a
                href="mailto:info@jalynsresort.com"
                className="group flex flex-col items-center gap-1.5 text-center"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#15181f] text-white/90 transition group-hover:border-white/20 group-hover:bg-[#1b1f28] group-hover:text-white">
                  <MailIcon className="h-4 w-4" />
                </span>
                <span className="text-[0.62rem] font-semibold tracking-wide text-white uppercase">
                  Email
                </span>
                <span className="max-w-[7.5rem] break-words text-[0.7rem] leading-snug text-white/85 sm:max-w-none sm:text-[0.75rem]">
                  info@jalynsresort.com
                </span>
              </a>
            </li>
          </ul>
        </Reveal>

        {/* Feature / awards card */}
        <Reveal delay={140} className="mt-6 md:mt-7">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#12151c]">
            <div className="grid grid-cols-2 md:grid-cols-4">
              {featureLinks.map((item, index) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`btn-press group relative flex min-h-[6.75rem] flex-col items-center justify-center gap-2 p-3 text-center transition hover:bg-white/[0.03] md:min-h-[9.5rem] md:gap-3 md:p-5 ${
                    index % 2 === 0 ? "border-r border-white/10" : ""
                  } ${index < 2 ? "border-b border-white/10 md:border-b-0" : ""} ${
                    index === 1 ? "md:border-r md:border-white/10" : ""
                  } ${index === 2 ? "md:border-r md:border-white/10" : ""}`}
                >
                  {item.logo}
                  <div>
                    <p className="text-[0.55rem] font-semibold tracking-[0.14em] text-white/45 uppercase md:text-[0.65rem] md:tracking-[0.16em]">
                      {item.eyebrow}
                    </p>
                    <p className="mt-0.5 text-[0.75rem] leading-snug font-semibold text-white md:mt-1 md:text-[0.95rem]">
                      {item.title}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Copyright */}
        <Reveal delay={200} variant="in" className="mt-6">
          <div className="flex items-center gap-2.5">
            <span className="h-px flex-1 bg-white/12" />
            <p className="shrink-0 text-[0.65rem] text-white/40">
              © {new Date().getFullYear()} Jalyn&apos;s Resort &amp; Restaurant
            </p>
            <span className="h-px flex-1 bg-white/12" />
          </div>
        </Reveal>
      </div>
    </footer>
  );
}
