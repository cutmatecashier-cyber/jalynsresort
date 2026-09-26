import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Navbar } from "./Navbar";
import type { UserRole } from "../types/database";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireVerified?: boolean;
  requireApproved?: boolean;
  roles?: UserRole[];
};

/** Same shell as Bookings/Members so auth wait does not flash a different layout. */
function AdminLoadingScreen({ title }: { title: string }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-foam text-ink">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] bg-[radial-gradient(ellipse_at_top,_rgba(3,105,161,0.08),_transparent_55%)]"
        aria-hidden
      />
      <div className="relative bg-[#050b12]">
        <Navbar />
      </div>
      <main className="relative mx-auto w-full max-w-[90rem] flex-1 px-4 pt-8 sm:px-6 sm:pt-10 md:px-8 lg:px-10 xl:px-12">
        <header className="max-w-2xl">
          <p className="text-[0.62rem] font-semibold tracking-[0.22em] text-sky uppercase">
            Admin only
          </p>
          <h1 className="mt-1.5 font-display text-3xl tracking-tight text-ink sm:text-4xl md:text-[2.75rem]">
            {title}
          </h1>
          <p className="mt-3 text-sm text-stone">Loading…</p>
        </header>
        <div className="mt-8 space-y-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[4.5rem] animate-pulse rounded-2xl border border-ink/6 bg-white/80"
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-foam text-ink">
      <p className="text-sm tracking-wide text-stone">Loading…</p>
    </div>
  );
}

export function ProtectedRoute({
  children,
  requireVerified = true,
  requireApproved = true,
  roles,
}: ProtectedRouteProps) {
  const { loading, user, emailVerified, isApproved, role, approvalStatus } = useAuth();
  const location = useLocation();
  const isBookings = location.pathname.startsWith("/bookings");
  const isMembers = location.pathname.startsWith("/members");
  const adminShell = isBookings || isMembers;

  // Important: wait for profile fetch after refresh before deciding Pending vs Admin
  if (loading) {
    if (adminShell) {
      return <AdminLoadingScreen title={isBookings ? "Bookings" : "Member Management"} />;
    }
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requireVerified && !emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (requireApproved && !isApproved) {
    return (
      <Navigate
        to="/pending-approval"
        replace
        state={{ status: approvalStatus ?? "pending" }}
      />
    );
  }

  if (roles && (!role || !roles.includes(role))) {
    return <Navigate to="/" replace />;
  }

  return children;
}
