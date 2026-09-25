import type { ApprovalStatus, UserRole } from "../types/database";

/** Central permission map — adjust here when Admin / Manager / Owner diverge later. */
export const permissions = {
  canAccessStaffArea: (role: UserRole | null, status: ApprovalStatus | null) =>
    Boolean(role && status === "approved"),

  /** Admin-only: Member Management (/members) */
  canManageMembers: (role: UserRole | null, status: ApprovalStatus | null) =>
    role === "admin" && status === "approved",

  /** Alias kept for older call sites */
  canManageUsers: (role: UserRole | null, status: ApprovalStatus | null) =>
    role === "admin" && status === "approved",

  canViewDashboardExtras: (role: UserRole | null, status: ApprovalStatus | null) =>
    Boolean(role && status === "approved"),

  canManageBookings: (role: UserRole | null, status: ApprovalStatus | null) =>
    Boolean(role && status === "approved"),

  canManageContent: (role: UserRole | null, status: ApprovalStatus | null) =>
    Boolean(role && status === "approved"),

  /** Admin-only: edit public resort contact details */
  canEditContactInfo: (role: UserRole | null, status: ApprovalStatus | null) =>
    role === "admin" && status === "approved",

  /** Admin-only: scuba diving rates, PADI courses, and page images */
  canManageScubaDiving: (role: UserRole | null, status: ApprovalStatus | null) =>
    role === "admin" && status === "approved",

  /** Admin-only: restaurant menu categories & items */
  canEditRestaurantMenu: (role: UserRole | null, status: ApprovalStatus | null) =>
    role === "admin" && status === "approved",

  /** Admin-only: restaurant page hero/content backgrounds and review replies */
  canManageRestaurantPage: (role: UserRole | null, status: ApprovalStatus | null) =>
    role === "admin" && status === "approved",

  /** Admin-only: home page hero background slides */
  canEditHomeBackground: (role: UserRole | null, status: ApprovalStatus | null) =>
    role === "admin" && status === "approved",

  /** Admin-only: Rooms & Apartments catalog, images, and page backgrounds */
  canEditRooms: (role: UserRole | null, status: ApprovalStatus | null) =>
    role === "admin" && status === "approved",

  /** Admin-only: Moments by the water gallery photos */
  canEditGallery: (role: UserRole | null, status: ApprovalStatus | null) =>
    role === "admin" && status === "approved",

  /** Admin-only: SPA categories, services, and category pictures */
  canEditSpa: (role: UserRole | null, status: ApprovalStatus | null) =>
    role === "admin" && status === "approved",

  /** Admin-only: News, Offers & Events posts */
  canEditNews: (role: UserRole | null, status: ApprovalStatus | null) =>
    role === "admin" && status === "approved",
} as const;

export function roleLabel(role: UserRole | null): string {
  if (!role) return "Pending";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function statusLabel(status: ApprovalStatus | null | undefined): string {
  if (!status) return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
}
