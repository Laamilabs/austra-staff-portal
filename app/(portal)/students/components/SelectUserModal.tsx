"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlertCircle,
    Loader2,
    Plus,
    Search,
    User as UserIcon,
    X,
} from "lucide-react";

import { userApi } from "@/app/types/users";
import { User } from "@/app/lib/types";

interface SelectUserModalProps {
    /** Controls visibility. */
    open: boolean;
    /** Called when the user closes the modal (backdrop, X, or Cancel). */
    onClose: () => void;
    /**
     * Called with the selected user. Return a Promise to keep the modal
     * open and show a spinner on that row until it resolves. Reject to
     * show an inline error without closing the modal.
     */
    onSelect: (user: User) => Promise<void> | void;
    /** Optional display name of the entity the user is being assigned to. */
    targetName?: string;
    /** Modal heading. Defaults to "Assign Existing User". */
    title?: string;
    /** Default role filter when the modal opens. Defaults to "student". */
    defaultRoleFilter?: "student" | "all";
    /** Optional email to filter the list directly down to one user. */
    email?: string;
    /** Optional student ID to pass to the user creation page. */
    studentId?: string;
}

export default function SelectUserModal({
    open,
    onClose,
    onSelect,
    targetName,
    title = "Assign Existing User",
    defaultRoleFilter = "student",
    email,
    studentId,
}: SelectUserModalProps) {
    const router = useRouter();

    const [users, setUsers] = useState<User[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersError, setUsersError] = useState<string | null>(null);

    const [userSearch, setUserSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<"student" | "all">(
        defaultRoleFilter
    );

    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Helper to build creation path
    const handleCreateNewUser = useCallback(() => {
        const queryParams = new URLSearchParams();
        if (studentId) queryParams.set("studentId", studentId);
        if (email) queryParams.set("email", email);

        const queryStr = queryParams.toString();
        const targetUrl = queryStr ? `/users/new?${queryStr}` : "/users/new";

        router.push(targetUrl);
    }, [router, studentId, email]);

    // -------------------------------------------------------------------
    // Fetch users lazily, once per mount of the modal contents
    // -------------------------------------------------------------------
    useEffect(() => {
        if (!open) return;
        if (users.length > 0) return;

        let cancelled = false;

        (async () => {
            try {
                setUsersLoading(true);
                setUsersError(null);

                const res = await userApi.getAll();

                if (cancelled) return;

                const fetchedUsers: User[] = res.data || [];
                setUsers(fetchedUsers);
            } catch (err) {
                console.error("Failed to load users:", err);
                if (!cancelled) setUsersError("Failed to load user accounts.");
            } finally {
                if (!cancelled) setUsersLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open, users.length]);

    // -------------------------------------------------------------------
    // Reset transient UI state each time the modal is opened
    // -------------------------------------------------------------------
    useEffect(() => {
        if (!open) return;

        setUserSearch("");
        setSubmitError(null);
        setRoleFilter(defaultRoleFilter);
    }, [open, defaultRoleFilter]);

    // -------------------------------------------------------------------
    // Filtered + sorted user list
    // -------------------------------------------------------------------
    const filteredUsers = useMemo(() => {
        const targetEmail = email?.trim().toLowerCase();
        const q = userSearch.trim().toLowerCase();

        return users
            .filter((u) => {
                const uEmail = (u.email || "").toLowerCase();

                // If email prop is provided, strictly limit display to that matching email
                if (targetEmail) {
                    return uEmail === targetEmail;
                }

                if (roleFilter === "student" && u.role !== "student") return false;
                if (!q) return true;

                const name = (u.name || "").toLowerCase();
                return name.includes(q) || uEmail.includes(q);
            })
            .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }, [users, userSearch, roleFilter, email]);

    // -------------------------------------------------------------------
    // Selection handler — delegates async work to the parent
    // -------------------------------------------------------------------
    const handleSelect = useCallback(
        async (user: User) => {
            const id = user.id || (user as any)._id;

            try {
                setSubmittingId(id);
                setSubmitError(null);

                await onSelect(user);

                // Parent resolved successfully — close.
                onClose();
            } catch (err: any) {
                console.error("Failed to assign user:", err);

                const msg =
                    err?.response?.data?.message ||
                    "Failed to assign user. Please try again.";

                setSubmitError(Array.isArray(msg) ? msg.join(", ") : msg);
            } finally {
                setSubmittingId(null);
            }
        },
        [onSelect, onClose]
    );

    if (!open) return null;

    const isBusy = Boolean(submittingId);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => {
                if (!isBusy) onClose();
            }}
        >
            <div
                className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
                    <div>
                        <h3 className="text-base font-bold text-[#0B1E3D] dark:text-white">
                            {title}
                        </h3>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {targetName ? (
                                <>
                                    Link an existing user account to{" "}
                                    <span className="font-medium text-zinc-700 dark:text-zinc-200">
                                        {targetName}
                                    </span>
                                    .
                                </>
                            ) : (
                                "Pick a user account from the list below."
                            )}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isBusy}
                        className="rounded-sm p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Filters (Hidden when locked to a specific email) */}
                {!email && (
                    <div className="border-b border-zinc-100 bg-zinc-50/60 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="relative flex-1">
                                <Search
                                    size={15}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                                />
                                <input
                                    type="text"
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    placeholder="Search by name or email..."
                                    className="h-9 w-full rounded-sm border border-zinc-200 bg-white pl-9 pr-3 text-xs outline-none transition focus:border-[#0B1E3D] focus:ring-2 focus:ring-[#0B1E3D]/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
                                />
                            </div>

                            <select
                                value={roleFilter}
                                onChange={(e) =>
                                    setRoleFilter(e.target.value as "student" | "all")
                                }
                                className="h-9 rounded-sm border border-zinc-200 bg-white px-2 text-xs text-zinc-700 outline-none focus:border-[#0B1E3D] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-orange-400"
                            >
                                <option value="student">Students only</option>
                                <option value="all">All roles</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Submit error */}
                {submitError && (
                    <div className="mx-6 mt-4 flex items-start gap-2 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>{submitError}</span>
                    </div>
                )}

                {/* List */}
                <div className="flex-1 overflow-y-auto px-3 py-3">
                    {usersLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Loader2 className="mb-2 h-6 w-6 animate-spin text-[#0B1E3D] dark:text-orange-400" />
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Loading user account...
                            </p>
                        </div>
                    ) : usersError ? (
                        <div className="px-3 py-6 text-center text-xs text-red-600 dark:text-red-400">
                            {usersError}
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-3 py-10 text-center">
                            <UserIcon
                                size={22}
                                className="mb-2 text-zinc-300 dark:text-zinc-600"
                            />
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {userSearch || roleFilter !== "all"
                                    ? "No matching users found."
                                    : email
                                        ? `No user account found with email "${email}".`
                                        : "No user found."}
                            </p>

                            <button
                                type="button"
                                onClick={handleCreateNewUser}
                                className="mt-4 flex items-center gap-1.5 rounded-sm bg-[#0B1E3D] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#0B1E3D]/90 dark:bg-orange-500 dark:hover:bg-orange-600"
                            >
                                <Plus size={14} />
                                Create New User
                            </button>
                        </div>
                    ) : (
                        <ul className="space-y-1">
                            {filteredUsers.map((user) => {
                                const id = user.id || (user as any)._id;
                                const isAssigning = submittingId === id;

                                return (
                                    <li key={id}>
                                        <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => handleSelect(user)}
                                            className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-zinc-800/60"
                                        >
                                            {/* Avatar */}
                                            {user.profileImage ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={user.profileImage}
                                                    alt={user.name}
                                                    className="h-9 w-9 shrink-0 rounded-sm border border-zinc-200 object-cover dark:border-zinc-700"
                                                />
                                            ) : (
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D]/10 text-xs font-semibold text-[#0B1E3D] dark:bg-orange-400/10 dark:text-orange-400">
                                                    {(user.name || "?")
                                                        .split(" ")
                                                        .map((p) => p[0])
                                                        .filter(Boolean)
                                                        .slice(0, 2)
                                                        .join("")
                                                        .toUpperCase()}
                                                </div>
                                            )}

                                            {/* Identity */}
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-[#0B1E3D] dark:text-white">
                                                    {user.name || "Unnamed user"}
                                                </p>
                                                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                    {user.email}
                                                </p>
                                            </div>

                                            {/* Role badge */}
                                            <span
                                                className={`shrink-0 rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${user.role === "student"
                                                        ? "bg-[#0B1E3D]/10 text-[#0B1E3D] dark:bg-orange-400/10 dark:text-orange-400"
                                                        : user.role === "admin"
                                                            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                                                    }`}
                                            >
                                                {user.role || "user"}
                                            </span>

                                            {isAssigning && (
                                                <Loader2
                                                    size={14}
                                                    className="shrink-0 animate-spin text-[#0B1E3D] dark:text-orange-400"
                                                />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/60 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <p className="text-[11px] text-zinc-400">
                        {filteredUsers.length}{" "}
                        {filteredUsers.length === 1 ? "account" : "accounts"}
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCreateNewUser}
                            className="flex items-center gap-1.5 rounded-sm border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            <Plus size={14} />
                            Create New User
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isBusy}
                            className="rounded-sm border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}