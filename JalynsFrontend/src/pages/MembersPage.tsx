import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../lib/api";
import { roleLabel, statusLabel } from "../lib/permissions";
import { supabase } from "../lib/supabase";
import type { ApprovalStatus, MemberRow, UserRole } from "../types/database";

type StatusFilter = "all" | ApprovalStatus;

const assignableRoles: Exclude<UserRole, "admin">[] = ["manager", "owner"];

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function StatusBadge({ status }: { status: ApprovalStatus }) {
  const styles: Record<ApprovalStatus, string> = {
    pending: "bg-amber-100 text-amber-900 border-amber-200",
    approved: "bg-emerald-100 text-emerald-900 border-emerald-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}

export function MembersPage() {
  const { can, role, approvalStatus, user } = useAuth();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [acceptFor, setAcceptFor] = useState<MemberRow | null>(null);
  const [rejectFor, setRejectFor] = useState<MemberRow | null>(null);
  const [deleteFor, setDeleteFor] = useState<MemberRow | null>(null);
  const [pickedRole, setPickedRole] = useState<"manager" | "owner">("manager");

  const allowed = can.canManageMembers(role, approvalStatus);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("admin_list_verified_members");

    if (rpcError) {
      setError(
        rpcError.message.includes("Could not find the function")
          ? "Member RPC missing. Run supabase/MEMBER_MANAGEMENT.sql in the Supabase SQL Editor, then refresh."
          : rpcError.message,
      );
      setMembers([]);
    } else {
      setMembers((data as MemberRow[] | null) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (allowed) void loadMembers();
  }, [allowed, loadMembers]);

  const filtered = useMemo(() => {
    if (filter === "all") return members;
    return members.filter((m) => m.approval_status === filter);
  }, [members, filter]);

  async function confirmAccept() {
    if (!acceptFor) return;
    if (acceptFor.approval_status === "rejected") {
      setError("Rejected accounts cannot be accepted. Delete the account instead.");
      setAcceptFor(null);
      return;
    }
    setBusyId(acceptFor.id);
    setError(null);
    const { error: rpcError } = await supabase.rpc("admin_accept_member", {
      target_id: acceptFor.id,
      new_role: pickedRole,
    });
    if (rpcError) setError(rpcError.message);
    else await loadMembers();
    setBusyId(null);
    setAcceptFor(null);
  }

  async function confirmReject() {
    if (!rejectFor) return;
    setBusyId(rejectFor.id);
    setError(null);
    const { error: rpcError } = await supabase.rpc("admin_reject_member", {
      target_id: rejectFor.id,
    });
    if (rpcError) setError(rpcError.message);
    else await loadMembers();
    setBusyId(null);
    setRejectFor(null);
  }

  async function confirmDelete() {
    if (!deleteFor) return;
    setBusyId(deleteFor.id);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("Admin session expired. Please log in again.");
        return;
      }

      const res = await fetch(`${API_URL}/api/auth/admin/delete-member`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: deleteFor.id }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(body.message ?? "Could not delete member.");
      } else {
        await loadMembers();
      }
    } catch {
      setError("Cannot reach the API. Make sure the backend is running.");
    } finally {
      setBusyId(null);
      setDeleteFor(null);
    }
  }

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All verified" },
    { id: "pending", label: "Pending" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
  ];

  const actionProps = (m: MemberRow) => ({
    member: m,
    currentUserId: user?.id,
    busy: busyId === m.id,
    onAccept: () => {
      setPickedRole("manager");
      setAcceptFor(m);
    },
    onReject: () => setRejectFor(m),
    onDelete: () => setDeleteFor(m),
  });

  return (
    <div className="min-h-screen bg-foam text-ink">
      <header className="border-b border-sky-bright/30 bg-sky text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[0.55rem] font-medium tracking-[0.22em] text-white/75 uppercase">
              Admin only
            </p>
            <h1 className="font-display text-2xl sm:text-3xl">Member Management</h1>
          </div>
          <Link
            to="/"
            className="btn-press rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Back to site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`btn-press rounded-full px-3.5 py-2 text-sm font-semibold transition sm:px-4 ${
                filter === f.id
                  ? "bg-sky text-white"
                  : "border border-ink/10 bg-white text-ink hover:bg-mist"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-6 text-sm text-stone">Loading members…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-ink/8 bg-white p-6 text-sm text-stone">
            No verified members in this filter yet.
          </p>
        ) : (
          <>
            <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-ink/8 bg-white shadow-sm md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-sky-bright/30 bg-sky text-xs tracking-wide text-white uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Email status</th>
                    <th className="px-4 py-3 font-semibold">Account</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Registered</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id} className="border-b border-ink/6 last:border-0">
                      <td className="px-4 py-3 font-medium text-ink">{m.name || "—"}</td>
                      <td className="px-4 py-3 text-stone">{m.phone || "—"}</td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-stone">{m.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border border-sky/30 bg-sky/10 px-2.5 py-0.5 text-xs font-semibold text-sky">
                          Verified
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={m.approval_status} />
                      </td>
                      <td className="px-4 py-3">{roleLabel(m.role)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-stone">
                        {formatDate(m.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <MemberActions {...actionProps(m)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="mt-6 space-y-4 md:hidden">
              {filtered.map((m) => (
                <li
                  key={m.id}
                  className="rounded-2xl border border-ink/8 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{m.name || "—"}</p>
                      <p className="truncate text-sm text-stone">{m.email}</p>
                      <p className="text-sm text-stone">{m.phone || "—"}</p>
                    </div>
                    <StatusBadge status={m.approval_status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone">
                    <div>
                      <dt className="uppercase tracking-wide">Email</dt>
                      <dd className="mt-0.5 font-semibold text-sky">Verified</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wide">Role</dt>
                      <dd className="mt-0.5 font-semibold text-ink">{roleLabel(m.role)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="uppercase tracking-wide">Registered</dt>
                      <dd className="mt-0.5 text-ink">{formatDate(m.created_at)}</dd>
                    </div>
                  </dl>
                  <div className="mt-4">
                    <MemberActions {...actionProps(m)} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>

      {acceptFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-5 text-ink shadow-xl sm:p-6"
          >
            <h2 className="font-display text-2xl">Accept member</h2>
            <p className="mt-2 text-sm text-stone">
              Approve <strong className="text-ink">{acceptFor.name || acceptFor.email}</strong> and
              assign a role.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {assignableRoles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setPickedRole(r)}
                  className={`btn-press rounded-full px-4 py-2 text-sm font-semibold ${
                    pickedRole === r ? "bg-sky text-white" : "border border-ink/10 bg-foam text-ink"
                  }`}
                >
                  {roleLabel(r)}
                </button>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setAcceptFor(null)}
                className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === acceptFor.id}
                onClick={() => void confirmAccept()}
                className="btn-press rounded-full bg-sky px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-bright disabled:opacity-60"
              >
                Accept as {roleLabel(pickedRole)}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {rejectFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-5 text-ink shadow-xl sm:p-6"
          >
            <h2 className="font-display text-2xl">Reject account</h2>
            <p className="mt-2 text-sm text-stone">
              Reject <strong className="text-ink">{rejectFor.name || rejectFor.email}</strong>{" "}
              permanently? They cannot be accepted later. Use Delete to remove them from the
              database.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRejectFor(null)}
                className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === rejectFor.id}
                onClick={() => void confirmReject()}
                className="btn-press rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                Reject permanently
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-5 text-ink shadow-xl sm:p-6"
          >
            <h2 className="font-display text-2xl">Delete account</h2>
            <p className="mt-2 text-sm text-stone">
              Permanently delete{" "}
              <strong className="text-ink">{deleteFor.name || deleteFor.email}</strong> from Auth
              and the database? This cannot be undone.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteFor(null)}
                className="btn-press rounded-full border border-ink/15 px-4 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === deleteFor.id}
                onClick={() => void confirmDelete()}
                className="btn-press rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MemberActions({
  member,
  currentUserId,
  busy,
  onAccept,
  onReject,
  onDelete,
}: {
  member: MemberRow;
  currentUserId?: string;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  if (member.role === "admin" || member.id === currentUserId) {
    return <span className="text-xs font-medium text-sky">Protected admin</span>;
  }

  const isRejected = member.approval_status === "rejected";
  const isApproved = member.approval_status === "approved";

  return (
    <div className="flex flex-wrap gap-2">
      {!isRejected ? (
        <button
          type="button"
          disabled={busy}
          onClick={onAccept}
          className="btn-press rounded-full bg-sky px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-bright disabled:opacity-60 sm:text-sm"
        >
          {isApproved ? "Change role" : "Accept"}
        </button>
      ) : null}

      {!isRejected ? (
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          className="btn-press rounded-full border border-ink/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-mist disabled:opacity-60 sm:text-sm"
        >
          Reject
        </button>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={onDelete}
        className="btn-press rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60 sm:text-sm"
      >
        Delete
      </button>
    </div>
  );
}
