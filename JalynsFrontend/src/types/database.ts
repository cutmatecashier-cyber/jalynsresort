export type UserRole = "admin" | "manager" | "owner";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole | null;
  approval_status: ApprovalStatus;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
};

/** Row returned by admin_list_verified_members() — email-verified only */
export type MemberRow = Profile & {
  email_verified: boolean;
  email_confirmed_at: string | null;
};
