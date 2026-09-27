type BrandLogoProps = {
  size?: "nav" | "compact" | "auth";
  align?: "start" | "center";
};

const nameSize = {
  compact: "text-[1rem] sm:text-[1.12rem]",
  nav: "text-[1.2rem] sm:text-[1.45rem] md:text-[1.6rem] lg:text-[1.7rem]",
  auth: "text-[1.7rem] sm:text-[2.05rem] md:text-[2.4rem]",
} as const;

const tagSize = {
  compact: "text-[0.48rem] tracking-[0.14em] sm:text-[0.52rem]",
  nav: "text-[0.55rem] tracking-[0.16em] sm:text-[0.62rem] md:text-[0.68rem] lg:text-[0.72rem]",
  auth: "text-[0.72rem] tracking-[0.18em] sm:text-[0.84rem] md:text-[0.95rem]",
} as const;

/** Wordmark: Ravie for the name, Arial Nova for the tagline. */
export function BrandLogo({ size = "nav", align = "center" }: BrandLogoProps) {
  return (
    <span
      className={`inline-flex max-w-full flex-col ${align === "start" ? "items-start" : "items-center"}`}
    >
      <span
        className={`font-logo block whitespace-nowrap leading-[1.15] text-white transition-[font-size] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${nameSize[size]}`}
      >
        Jalyn&apos;s <span className="text-[#e10613]">Resort</span>
      </span>
      <span
        className={`font-logo-tag mt-0.5 block whitespace-nowrap font-normal text-white/80 uppercase transition-[font-size,letter-spacing] duration-300 ${tagSize[size]}`}
      >
        Restaurant - Spa - Dive Resort
      </span>
    </span>
  );
}
