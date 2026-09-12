import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/database";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireVerified?: boolean;
  requireApproved?: boolean;
  roles?: UserRole[];
};

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

  // Important: wait for profile fetch after refresh before deciding Pending vs Admin
  if (loading) {
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
