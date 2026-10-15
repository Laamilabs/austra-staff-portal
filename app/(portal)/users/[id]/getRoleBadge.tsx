import { User as UserType, UserRole } from "@/app/lib/types";
import {
  ShieldCheck,
  User as UserIcon,
  GraduationCap,
} from "lucide-react";
/**
 * Returns a styled badge element for a given user role.
 */
export function getRoleBadge(role: UserRole) {
  switch (role) {
    case "admin":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          Administrator
        </span>
      );
    case "staff":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
          <UserIcon className="h-3.5 w-3.5" />
          Staff Member
        </span>
      );
    case "student":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <GraduationCap className="h-3.5 w-3.5" />
          Student
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
          {role}
        </span>
      );
  }
}

/**
 * Returns the initials for a user's name (max 2 characters).
 */
export function getUserInitials(name?: string): string {
  if (!name) return "U";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

/**
 * Safely extracts a user's ID (supports both `id` and `_id`).
 */
export function getUserId(user: UserType & { _id?: string }): string {
  return user.id || user._id || "";
}