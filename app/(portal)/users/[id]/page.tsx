"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Loader2,
    AlertCircle,
    Check,
    Edit2,
    Trash2,
    Mail,
    Key,
} from "lucide-react";

import api from "@/app/lib/api";
import { User as UserType, UserRole } from "@/app/lib/types";
import { CloudinaryUpload } from "@/app/components/ui/cloudinary";

import DeleteUserModal from "./DeleteUserModal";
import ChangePasswordCard from "./ChangePasswordCard";
import { getUserInitials, getRoleBadge, getUserId } from "./getRoleBadge";

export default function UserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.id as string;

    const [user, setUser] = useState<UserType | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [deleting, setDeleting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Edit Mode state
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [formData, setFormData] = useState<{
        name: string;
        email: string;
        role: UserRole;
        profileImage: string;
    }>({
        name: "",
        email: "",
        role: "student",
        profileImage: "",
    });

    // Delete modal confirmation
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

    useEffect(() => {
        if (userId) {
            fetchUser();
        }
    }, [userId]);

    const fetchUser = async () => {
        try {
            setLoading(true);
            setError(null);
            // GET /users/:id via NestJS UserService.findOne(id)
            const response = await api.get<UserType>(`/users/${userId}`);
            const userData = response.data;
            setUser(userData);
            setFormData({
                name: userData.name || "",
                email: userData.email || "",
                role: userData.role || "student",
                profileImage: userData.profileImage || "",
            });
        } catch (err: any) {
            console.error("Failed to fetch user:", err);
            setError(
                err.response?.data?.message || "Failed to load user profile.",
            );
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);
            setSuccessMsg(null);

            // PATCH /users/:id via NestJS UserService.update(id, updateUserDto)
            const response = await api.patch<UserType>(`/users/${userId}`, formData);
            setUser(response.data);
            setIsEditing(false);
            setSuccessMsg("User updated successfully.");

            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err: any) {
            console.error("Failed to update user:", err);
            setError(
                err.response?.data?.message ||
                "Failed to update user. Please try again.",
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            setDeleting(true);
            setError(null);

            // DELETE /users/:id via NestJS UserService.remove(id)
            await api.delete(`/users/${userId}`);
            router.push("/users");
        } catch (err: any) {
            console.error("Failed to delete user:", err);
            setError(err.response?.data?.message || "Failed to delete user.");
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        if (user) {
            setFormData({
                name: user.name || "",
                email: user.email || "",
                role: user.role || "student",
                profileImage: user.profileImage || "",
            });
        }
    };

    /* ---------- Loading State ---------- */
    if (loading) {
        return (
            <div className="p-6">
                <div className="flex h-64 items-center justify-center rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
                        <Loader2 className="h-5 w-5 animate-spin text-[#082B66] dark:text-orange-400" />
                        <span className="text-sm font-medium">Loading user details...</span>
                    </div>
                </div>
            </div>
        );
    }

    /* ---------- Fatal Error State ---------- */
    if (error && !user) {
        return (
            <div className="space-y-6 p-6">
                <Link
                    href="/users"
                    className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Users
                </Link>
                <div className="flex items-center gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-400 space-y-6 p-6">
            {/* Navigation & Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <Link
                    href="/users"
                    className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-[#082B66] dark:text-zinc-400 dark:hover:text-orange-400"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to User List
                </Link>

                <div className="flex items-center gap-2">
                    {!isEditing ? (
                        <>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="inline-flex items-center gap-2 rounded-sm border border-zinc-200 bg-white px-3.5 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                                <Edit2 className="h-4 w-4" />
                                Edit User
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="inline-flex items-center gap-2 rounded-sm bg-red-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleCancelEdit}
                            className="inline-flex items-center gap-2 rounded-sm border border-zinc-200 bg-white px-3.5 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            Cancel Edit
                        </button>
                    )}
                </div>
            </div>

            {/* Alert Messages */}
            {successMsg && (
                <div className="flex items-center gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm font-medium">{successMsg}</p>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Main Profile Card */}
            <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                {/* Banner */}
                <div className="h-28 bg-[#082B66] dark:bg-zinc-800/80" />

                <div className="relative px-6 pb-6">
                    {/* Avatar Header */}
                    <div className="-mt-12 mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div className="flex items-end gap-4">
                            {user?.profileImage ? (
                                <img
                                    src={user.profileImage}
                                    alt={user.name}
                                    className="h-42 w-42 rounded-sm border-2 border-orange-400 object-cover shadow-md dark:border-zinc-900"
                                />
                            ) : (
                                <div className="flex h-42 w-42 items-center justify-center rounded-sm border-2 border-orange-400 bg-[#082B66] text-2xl font-bold text-white shadow-md dark:border-zinc-900 dark:bg-orange-500 dark:text-zinc-950">
                                    {getUserInitials(user?.name)}
                                </div>
                            )}
                            <div>
                                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                    {user?.name}
                                </h2>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    {user?.email}
                                </p>
                            </div>
                        </div>
                        {user && <div>{getRoleBadge(user.role)}</div>}
                    </div>

                    {!isEditing ? (
                        /* View Details Mode */
                        <div className="grid grid-cols-1 gap-6 border-t border-zinc-100 pt-4 dark:border-zinc-800 md:grid-cols-2">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        Full Name
                                    </label>
                                    <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                        {user?.name}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        Email Address
                                    </label>
                                    <div className="mt-1 flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-zinc-400" />
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {user?.email}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        Assigned Role
                                    </label>
                                    <p className="mt-1 text-sm font-medium capitalize text-zinc-900 dark:text-zinc-100">
                                        {user?.role}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                        System ID
                                    </label>
                                    <div className="mt-1 flex items-center gap-2">
                                        <Key className="h-4 w-4 text-zinc-400" />
                                        <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                                            {user ? getUserId(user as UserType & { _id?: string }) : ""}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Form Edit Mode */
                        <form
                            onSubmit={handleUpdate}
                            className="space-y-5 border-t border-zinc-100 pt-4 dark:border-zinc-800"
                        >
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        className="mt-1 w-full rounded-sm border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#082B66] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-orange-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        className="mt-1 w-full rounded-sm border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#082B66] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-orange-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        User Role
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                role: e.target.value as UserRole,
                                            })
                                        }
                                        className="mt-1 w-full rounded-sm border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#082B66] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-orange-400"
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="staff">Staff</option>
                                        <option value="student">Student</option>
                                    </select>
                                </div>

                                <div>
                                    <CloudinaryUpload
                                        value={formData.profileImage}
                                        onChange={(url) =>
                                            setFormData({ ...formData, profileImage: url })
                                        }
                                        preset="photos"
                                        label="Profile Image"
                                        disabled={saving}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="rounded-sm border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 rounded-sm bg-[#082B66] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#082B66]/90 disabled:opacity-50 dark:bg-orange-500 dark:text-zinc-950 dark:hover:bg-orange-400"
                                >
                                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Change Password Card */}
            <ChangePasswordCard userId={userId} />

            {/* Delete Confirmation Modal */}
            <DeleteUserModal
                isOpen={showDeleteModal}
                userName={user?.name}
                deleting={deleting}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
            />
        </div>
    );
}