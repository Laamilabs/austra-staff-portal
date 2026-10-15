"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/app/context/AuthContext";
import type { UserRole } from "@/app/lib/types";

interface RequireRoleInlineProps {
  role?: UserRole;
  roles?: UserRole[];
  children: ReactNode;
  /**
   * Optional inline fallback (e.g., disabled button or small lock icon).
   * Defaults to rendering `null` if the user lacks the required role.
   */
  fallback?: ReactNode;
  /**
   * Optional loading state while auth is being restored.
   * Defaults to rendering `null` to avoid layout shifts in inline components.
   */
  loading?: ReactNode;
}

export default function RequireRoleInline({
  role,
  roles,
  children,
  fallback = null,
  loading = null,
}: RequireRoleInlineProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  /*
   * Auth is restoring
   */
  if (isLoading) {
    return <>{loading}</>;
  }

  /*
   * No active session
   */
  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  const allowedRoles = roles ?? (role ? [role] : []);

  /*
   * Fail closed if no roles provided
   */
  if (allowedRoles.length === 0) {
    return <>{fallback}</>;
  }

  /*
   * Normalize user role and allowed roles for comparison
   */
  const currentUserRole = String(user.role).trim().toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map((r) =>
    String(r).trim().toLowerCase()
  );

  if (!normalizedAllowedRoles.includes(currentUserRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}