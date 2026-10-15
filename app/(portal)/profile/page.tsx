"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Loader2,
    AlertCircle,
    Check,
    Edit2,
    DatabaseBackup,
} from "lucide-react";

import api from "@/app/lib/api";
import { User as UserType, UserRole } from "@/app/lib/types";
import { useAuth } from "@/app/context/AuthContext";

import DeleteUserModal from "../users/[id]/DeleteUserModal";
import { getUserId } from "../users/[id]/getRoleBadge";
import RequireRoleInline from "@/app/components/navigation/RequiredRoleInline";
import ChangePasswordCard from "./ChangePasswordCard";
import ProfileEditForm, { ProfileFormData } from "./ProfileEditForm";
import ProfileView from "./ProfileView";
import MyDocuments from "./MyDocuments";
import { downloadDatabaseBackup } from "@/app/types/db-backup";
import BackupModal, { type BackupStatus } from "@/app/components/layout/BackupModal";


export default function ProfilePage() {
    const router = useRouter();
    const { user: authUser, logout, isLoading: authLoading } = useAuth();

    const [user, setUser] = useState<UserType | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [deleting, setDeleting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [formData, setFormData] = useState<ProfileFormData>({
        name: "",
        email: "",
        role: "student",
        profileImage: "",
    });

    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

    // Backup modal state
    const [backupStatus, setBackupStatus] = useState<BackupStatus>("idle");
    const [backupError, setBackupError] = useState<string>("");

    const currentUserId = authUser
        ? getUserId(authUser as UserType & { _id?: string })
        : "";
    const isAdmin = String(authUser?.role || user?.role || "").trim().toLowerCase() === "admin";

    const handleDatabaseBackup = async () => {
        setBackupStatus("loading");
        setBackupError("");
        try {
            await downloadDatabaseBackup();
            setBackupStatus("success");
        } catch (err) {
            setBackupError(
                err instanceof Error
                    ? err.message
                    : "Database backup failed. Please try again.",
            );
            setBackupStatus("error");
        }
    };

    const closeBackupModal = () => {
        setBackupStatus("idle");
        setBackupError("");
    };

    useEffect(() => {
        if (!authLoading && !authUser) {
            router.push("/login");
            return;
        }
        if (authUser) fetchUserProfile();
    }, [authUser, authLoading]);

    const fetchUserProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get<UserType>(`/users/${currentUserId}`);
            const userData = response.data;
            setUser(userData);
            setFormData({
                name: userData.name || "",
                email: userData.email || "",
                role: userData.role || "student",
                profileImage: userData.profileImage || "",
            });
        } catch (err: any) {
            console.error("Failed to fetch profile:", err);
            if (authUser) {
                setUser(authUser);
                setFormData({
                    name: authUser.name || "",
                    email: authUser.email || "",
                    role: authUser.role || "student",
                    profileImage: authUser.profileImage || "",
                });
            } else {
                setError(
                    err.response?.data?.message || "Failed to load user profile.",
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUserId) return;
        try {
            setSaving(true);
            setError(null);
            setSuccessMsg(null);
            const response = await api.patch<UserType>(
                `/users/${currentUserId}`,
                formData,
            );
            setUser(response.data);
            setIsEditing(false);
            setSuccessMsg("Profile updated successfully.");
            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err: any) {
            console.error("Failed to update profile:", err);
            setError(
                err.response?.data?.message ||
                "Failed to update profile. Please try again.",
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!currentUserId) return;
        try {
            setDeleting(true);
            setError(null);
            await api.delete(`/users/${currentUserId}`);
            setShowDeleteModal(false);
            logout();
            router.push("/login");
        } catch (err: any) {
            console.error("Failed to delete profile:", err);
            setError(err.response?.data?.message || "Failed to delete account.");
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
    if (loading || authLoading) {
        return (
            <div className="p-6">
                <div className="flex h-64 items-center justify-center rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
                        <Loader2 className="h-5 w-5 animate-spin text-[#082B66] dark:text-orange-400" />
                        <span className="text-sm font-medium">
                            Loading profile details...
                        </span>
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
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
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
            {/* Header / Nav */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        My Profile
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Manage your account settings and profile details
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => setBackupStatus("confirm")}
                            className="inline-flex items-center gap-2 rounded-sm border border-orange-300 bg-orange-50 px-3.5 py-1.5 text-sm font-medium text-orange-800 shadow-sm transition-colors hover:bg-orange-100 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-300 dark:hover:bg-orange-950/50"
                        >
                            <DatabaseBackup className="h-4 w-4" />
                            Download DB backup
                        </button>
                    )}
                    {!isEditing ? (
                        <RequireRoleInline roles={["admin", "staff"]}>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="inline-flex items-center gap-2 rounded-sm border border-zinc-200 bg-white px-3.5 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                                <Edit2 className="h-4 w-4" />
                                Edit Profile
                            </button>
                        </RequireRoleInline>
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
                {user && !isEditing && <ProfileView user={user} />}
                {isEditing && (
                    <>
                        {/* Keep banner when editing */}
                        <div className="h-28 bg-[#082B66] dark:bg-zinc-800/80" />
                        <div className="relative px-6 pb-6">
                            <ProfileEditForm
                                formData={formData}
                                saving={saving}
                                onChange={setFormData}
                                onSubmit={handleUpdate}
                                onCancel={handleCancelEdit}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Change Password Card */}
            {currentUserId && <ChangePasswordCard userId={currentUserId} />}

            {/* My Documents */}
            {currentUserId && <MyDocuments userId={currentUserId} />}

            {/* Delete Confirmation Modal */}
            <DeleteUserModal
                isOpen={showDeleteModal}
                userName={user?.name}
                deleting={deleting}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteAccount}
            />

            {/* Database Backup Modal */}
            <BackupModal
                status={backupStatus}
                error={backupError}
                onConfirm={handleDatabaseBackup}
                onClose={closeBackupModal}
            />
        </div>
    );
}