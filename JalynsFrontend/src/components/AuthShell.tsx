import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

const bubbles = [
  {
    className:
      "glass-bubble top-[10%] right-[6%] h-[4.25rem] w-[4.25rem] opacity-[0.09] glass-bubble-delay-1",
  },
  {
    className:
      "glass-bubble glass-bubble-soft top-[18%] right-[18%] h-9 w-9 opacity-[0.09] glass-bubble-delay-3",
  },
  {
    className:
      "glass-bubble top-[32%] left-[5%] h-24 w-24 opacity-[0.09] glass-bubble-delay-2 hidden sm:block",
  },
  {
    className:
      "glass-bubble glass-bubble-soft top-[42%] left-[14%] h-11 w-11 opacity-[0.09] glass-bubble-delay-4 hidden md:block",
  },
  {
    className:
      "glass-bubble bottom-[28%] right-[7%] h-20 w-20 opacity-[0.09] glass-bubble-delay-1",
  },
  {
    className:
      "glass-bubble glass-bubble-soft bottom-[18%] right-[22%] h-12 w-12 opacity-[0.09] glass-bubble-delay-3 hidden sm:block",
  },
  {
    className:
      "glass-bubble bottom-[12%] left-[8%] h-14 w-14 opacity-[0.09] glass-bubble-delay-2",
  },
  {
    className:
      "glass-bubble glass-bubble-soft top-[8%] left-[12%] h-10 w-10 opacity-[0.09] glass-bubble-delay-4 hidden lg:block",
  },
] as const;

/** Shared auth layout — sky blue / black / white, aligned with homepage fonts. */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-70"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=2400&q=80)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky/35 via-ink/20 to-black/30"
        aria-hidden
      />
      {bubbles.map((bubble, index) => (
        <span key={index} className={bubble.className} aria-hidden="true" />
      ))}

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 pt-16 pb-12 sm:max-w-xl sm:px-6 sm:pt-20 sm:pb-14 md:max-w-2xl md:pt-24 md:pb-16">
        <div className="my-auto w-full">
          <Link to="/" className="mb-8 block text-center md:mb-10">
            <BrandLogo size="auth" />
          </Link>

          <div className="w-full rounded-2xl border border-white/20 bg-white/85 p-6 text-ink shadow-sm backdrop-blur-xl sm:p-8">
            <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-stone sm:text-[0.95rem]">{subtitle}</p>
            <div className="mt-6 sm:mt-7">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
