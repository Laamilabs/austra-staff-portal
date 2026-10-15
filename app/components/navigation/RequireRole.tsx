"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Home,
    ShieldX,
} from "lucide-react";

import { useAuth } from "@/app/context/AuthContext";
import type { UserRole } from "@/app/lib/types";

interface RequireRoleProps {
    role?: UserRole;
    roles?: UserRole[];
    children: ReactNode;
    fallback?: ReactNode;
    loading?: ReactNode;
}

export default function RequireRole({
    role,
    roles,
    children,
    fallback,
    loading = <RoleLoading />,
}: RequireRoleProps) {
    const {
        user,
        isLoading,
        isAuthenticated,
    } = useAuth();

    /*
     * Authentication is still being restored.
     */
    if (isLoading) {
        return <>{loading}</>;
    }

    /*
     * No authenticated user.
     */
    if (!isAuthenticated || !user) {
        return fallback ?? <Unauthorized />;
    }

    /*
     * Support:
     *
     * role="admin"
     *
     * or:
     *
     * roles={["admin", "staff"]}
     */
    const allowedRoles =
        roles ?? (role ? [role] : []);

    /*
     * Fail closed if no role is supplied.
     */
    if (allowedRoles.length === 0) {
        return fallback ?? <Unauthorized />;
    }

    /*
     * Normalize roles before comparison.
     *
     * Examples:
     *
     * "admin" === "ADMIN"
     * "Admin" === "admin"
     * "STAFF" === "staff"
     */
    const currentUserRole = String(user.role)
        .trim()
        .toLowerCase();

    const normalizedAllowedRoles =
        allowedRoles.map((allowedRole) =>
            String(allowedRole)
                .trim()
                .toLowerCase(),
        );

    /*
     * Check whether the current user's role is allowed.
     */
    if (
        !normalizedAllowedRoles.includes(
            currentUserRole,
        )
    ) {
        return fallback ?? <Unauthorized />;
    }

    return <>{children}</>;
}

/* -------------------------------------------------------------------------- */
/* Loading State                                                              */
/* -------------------------------------------------------------------------- */

function RoleLoading() {
    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="flex min-h-[60vh] items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">
                    <div className="rounded-sm border border-zinc-200 dark:border-zinc-800 border-t-4 border-t-orange-400 bg-white dark:bg-zinc-900 p-8 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D] dark:bg-orange-400">
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 dark:border-[#0B1E3D]/30 border-t-orange-400 dark:border-t-[#0B1E3D]" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="h-4 w-32 animate-pulse rounded-sm bg-zinc-200 dark:bg-zinc-800" />

                                <div className="mt-2 h-3 w-48 max-w-full animate-pulse rounded-sm bg-zinc-100 dark:bg-zinc-800/60" />
                            </div>
                        </div>

                        <div className="mt-6 h-2 w-full overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800">
                            <div className="h-full w-1/3 animate-pulse rounded-sm bg-orange-400" />
                        </div>

                        <p className="mt-4 text-xs text-zinc-400">
                            Verifying your access...
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}

/* -------------------------------------------------------------------------- */
/* Unauthorized State                                                         */
/* -------------------------------------------------------------------------- */

function Unauthorized() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="mx-auto flex min-h-[70vh] max-w-400 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
                <section className="w-full max-w-lg">
                    {/* Top accent */}
                    <div className="h-1 bg-orange-400" />

                    <div className="border border-t-0 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-7 shadow-sm sm:p-9">
                        {/* Icon */}
                        <div className="flex items-start gap-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D] text-orange-400">
                                <ShieldX
                                    size={27}
                                    strokeWidth={1.8}
                                />
                            </div>

                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500 dark:text-orange-400">
                                    Access Restricted
                                </p>

                                <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-[#0B1E3D] dark:text-white">
                                    Unauthorized Access
                                </h1>
                            </div>
                        </div>

                        {/* Message */}
                        <div className="mt-7 border-l-2 border-orange-400 bg-zinc-50 dark:bg-zinc-800/40 px-5 py-4">
                            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                                You do not have the required
                                permissions to access this
                                page.
                            </p>

                            <p className="mt-2 text-xs leading-5 text-zinc-400">
                                If you believe you should have
                                access, please contact your
                                administrator.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-[#0B1E3D] dark:text-zinc-100 transition-colors hover:border-[#0B1E3D] dark:hover:border-orange-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                            >
                                <ArrowLeft size={15} />
                                Go Back
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    router.push(
                                        "/dashboard",
                                    )
                                }
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-[#0B1E3D] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#10294d] dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
                            >
                                <Home size={15} />
                                Dashboard
                            </button>
                        </div>
                    </div>

                    {/* Small portal footer */}
                    <div className="flex items-center justify-center gap-2 px-4 pt-5">
                        <span className="h-px w-8 bg-zinc-200 dark:bg-zinc-800" />

                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                            Austra Staff Portal
                        </p>

                        <span className="h-px w-8 bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                </section>
            </div>
        </main>
    );
}