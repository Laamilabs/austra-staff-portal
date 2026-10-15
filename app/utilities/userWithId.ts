import { User } from "@/app/lib/types";

export type UserWithId = User & { _id?: string };

export function getInitials(name: string) {
  if (!name) return "F";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function getUserId(user: UserWithId): string {
  return user.id || user._id || "";
}