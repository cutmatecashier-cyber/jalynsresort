import { Link } from "react-router-dom";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

/** Shared auth layout — sky blue / black / white, aligned with homepage fonts. */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-40"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=2400&q=80)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/80 via-sky/35 to-black"
        aria-hidden
      />
      <div className="live-orb left-[8%] top-[18%] h-48 w-48 bg-sky/40 sm:h-64 sm:w-64" />
      <div className="live-orb live-orb-delayed right-[6%] bottom-[12%] h-56 w-56 bg-sky-bright/30" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-10 sm:px-6">
        <Link to="/" className="mb-8 block text-center sm:mb-10">
          <span className="font-script block text-[2rem] leading-none text-white sm:text-[2.35rem]">
            Jalyn&apos;s
          </span>
          <span className="mt-1 block text-[0.55rem] font-medium tracking-[0.22em] text-white/70 uppercase">
            Resort &amp; Restaurant
          </span>
        </Link>

        <div className="w-full rounded-2xl border border-white/15 bg-white p-6 text-ink shadow-2xl sm:p-8">
          <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone sm:text-[0.95rem]">{subtitle}</p>
          <div className="mt-6 sm:mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}
