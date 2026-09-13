import { Link, Navigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";

export function PendingApprovalPage() {
  const { loading, isApproved, approvalStatus, signOut, profile } = useAuth();
  const rejected = approvalStatus === "rejected";

  // Approved users (e.g. Admin) who landed here after a refresh race → go home
  if (!loading && isApproved) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-foam text-ink">
        <p className="text-sm tracking-wide text-stone">Loading…</p>
      </div>
    );
  }

  return (
    <AuthShell
      title={rejected ? "Account rejected" : "Pending approval"}
      subtitle={
        rejected
          ? "Your account registration has been rejected. Please contact the administrator."
          : `Hi${profile?.name ? ` ${profile.name}` : ""}, your email is verified, but your account is still waiting for Admin approval. You cannot access the website until an Admin accepts your registration and assigns Manager or Owner.`
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => void signOut()}
          className="btn-press inline-flex flex-1 items-center justify-center rounded-full bg-sky px-5 py-3.5 text-base font-semibold text-white transition hover:bg-sky-bright"
        >
          Sign out
        </button>
        <Link
          to="/"
          className="btn-press inline-flex flex-1 items-center justify-center rounded-full border border-ink/15 px-5 py-3.5 text-base font-semibold text-ink transition hover:bg-foam"
        >
          Public homepage
        </Link>
      </div>
    </AuthShell>
  );
}
