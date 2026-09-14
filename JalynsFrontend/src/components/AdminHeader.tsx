import { Link, useLocation } from "react-router-dom";

const adminLinks = [{ to: "/members", label: "Members" }] as const;

export function AdminHeader({ title }: { title: string }) {
  const location = useLocation();

  return (
    <header className="border-b border-sky-bright/30 bg-sky text-white">
      <div className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
        <div>
          <p className="text-[0.55rem] font-medium tracking-[0.22em] text-white/75 uppercase">
            Admin only
          </p>
          <h1 className="font-display text-2xl sm:text-3xl">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {adminLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`btn-press rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-white text-ink"
                    : "border border-white/25 text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            to="/"
            className="btn-press rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Back to site
          </Link>
        </div>
      </div>
    </header>
  );
}
