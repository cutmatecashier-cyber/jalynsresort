type IconProps = { className?: string };

export function ArrowRightIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronLeftIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 6 9 12l6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronRightIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BedIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 18V9.5A2.5 2.5 0 0 1 5.5 7H11a3 3 0 0 1 3 3v1h5.5A1.5 1.5 0 0 1 21 12.5V18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M3 14h18M7 7V5.5A1.5 1.5 0 0 1 8.5 4H11" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function UtensilsIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 3v7M6 3v4a2 2 0 0 0 4 0V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 10v11M16 3v7c0 1.5 1 2 2 2v9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function DiveIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15.5" cy="9" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 14.5c1.8 3 4.2 4.5 7 4.5s5.2-1.5 7-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function LotusIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 19c-3.5-2.2-6-5.2-6-8.2C6 7.5 8.5 5 12 5s6 2.5 6 5.8c0 3-2.5 6-6 8.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M12 19V9M8.5 11.5C7 10 6.5 8 7 6.5M15.5 11.5c1.5-1.5 2-3.5 1.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function WifiIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 9.5c4-3.5 10-3.5 14 0M7.5 12.5c2.8-2.3 6.2-2.3 9 0M10 15.5c1.2-1 2.8-1 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="18.2" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function AcIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 16.5c1 .8 2 .8 3 0s2-.8 3 0 2 .8 3 0 2-.8 3 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function BalconyIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20V9l8-4 8 4v11" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 14h16M8 14v6M12 14v6M16 14v6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function ServiceBellIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 15a6 6 0 0 1 12 0H6Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 5v2M5 18h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function StarIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="m10 1.8 2.3 4.7 5.2.8-3.8 3.6.9 5.2L10 13.7 5.4 16.1l.9-5.2L2.5 7.3l5.2-.8L10 1.8Z" />
    </svg>
  );
}

export function MapPinIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function PhoneIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.5 4.5h3l1.2 4-2 1.2a12 12 0 0 0 5.6 5.6l1.2-2 4 1.2v3A2 2 0 0 1 18.5 19 14.5 14.5 0 0 1 5 5.5a2 2 0 0 1 2.5-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MailIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function LocationIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function DiveFlagIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 4v16M6 5h10l-2.5 3.5L16 12H6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function HeartHandIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 19s-6-3.8-6-8a3.5 3.5 0 0 1 6-2.4A3.5 3.5 0 0 1 18 11c0 4.2-6 8-6 8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EyeIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function EyeOffIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.5 10.6a2.75 2.75 0 0 0 3.9 3.9M9.4 5.6A10.4 10.4 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.6 16.6 0 0 1-3.2 3.7M6.2 6.7A16.3 16.3 0 0 0 2.5 12S6 18.5 12 18.5c1.3 0 2.5-.3 3.6-.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThreeDivesIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 16c1.4-2.2 3-3.5 5-3.5s3.6 1.3 5 3.5M13 16c1.2-1.8 2.5-2.8 4-2.8 1.6 0 3 1.2 4 2.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M5 11c1.2-1.8 2.6-2.8 4.3-2.8 1.8 0 3.2 1 4.4 2.8M7 7.2c1-1.4 2.1-2.2 3.5-2.2s2.5.8 3.5 2.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoonIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15.5 4.2A7.8 7.8 0 1 0 20 14.6 6.4 6.4 0 0 1 15.5 4.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DayTripIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 4.5V3M12 21v-1.5M19.5 12H21M3 12h1.5M17.3 6.7l1.1-1.1M5.6 18.4l1.1-1.1M17.3 17.3l1.1 1.1M5.6 5.6l1.1 1.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GroupIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16" cy="9" r="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4.5 18.5c.6-2.8 2.5-4.3 4.5-4.3s3.9 1.5 4.5 4.3M13.2 14.6c1.6-.4 3.2.5 4 2.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BangkaIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 14.5 12 8l8 6.5M5.5 14.5h13c.4 2.2-2.2 4-6.5 4s-6.9-1.8-6.5-4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8 14.5V11M16 14.5V11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SpeedboatIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 15.5h15.5L21 12H9.5L8 15.5M5 18.2h11M7.5 20.2h8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 12V8.5h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function PoolIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 16.5c1.2 1 2.3 1 3.5 0s2.3-1 3.5 0 2.3 1 3.5 0 2.3-1 3.5 0M4 20c1.2 1 2.3 1 3.5 0s2.3-1 3.5 0 2.3 1 3.5 0 2.3-1 3.5 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M7 15V6.5A1.5 1.5 0 0 1 8.5 5H11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function CertificateIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="12.5" rx="1.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 8h8M8 11.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M10 16.5v3.2l2-1.1 2 1.1V16.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShieldIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5 5.5 6v5.2c0 4.2 2.8 7.4 6.5 8.8 3.7-1.4 6.5-4.6 6.5-8.8V6L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9.2 12.1 11 14l3.8-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ResearchIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.5 3.5h5v6.2l2.8 4.4c.7 1.1-.1 2.6-1.4 2.6H8.1c-1.3 0-2.1-1.5-1.4-2.6l2.8-4.4V3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9.5 6.5h5M10.5 16.7v3.8M13.5 16.7v3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function WaveIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 14.5c2.2-2.2 4.2-2.2 6.2 0s4 2.2 6.2 0 4-2.2 6.2 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M3 9.5c2.2-2.2 4.2-2.2 6.2 0s4 2.2 6.2 0 4-2.2 6.2 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
