import { Navigate } from "react-router-dom";

/** @deprecated Use /members (MembersPage). Kept so old imports do not break. */
export function AdminUsersPage() {
  return <Navigate to="/members" replace />;
}
