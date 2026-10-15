"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Briefcase,
    Building,
    GraduationCap,
    Mail,
    Pencil,
    Trash2,
    User as UserIcon,
    UserCheck,
    UserPlus,
    UserX,
    AlertCircle,
    RefreshCw,
    Shield,
} from "lucide-react";

import api from "@/app/lib/api";
import { User } from "@/app/lib/types";
import { Faculty } from "@/app/types/faculty";

import FacultyDetailSkeleton from "./FacultyDetailSkeleton";
import AssignUserModal from "./AssignUserModal";
import MyDocuments from "@/app/(portal)/profile/MyDocuments";
import { getInitials, getUserId } from "@/app/utilities/userWithId";
import RequireRoleInline from "@/app/components/navigation/RequiredRoleInline";

export default function FacultyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const facultyId = params.id as string;

    const [faculty, setFaculty] = useState<Faculty | null>(null);
    const [unlinkedUsers, setUnlinkedUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Assign user modal state
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    // Delete modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const fetchFacultyDetails = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get<Faculty>(`/faculty/${facultyId}`);
            setFaculty(response.data);
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                "Failed to load faculty details. Please try again.",
            );
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get<User[]>("/users");
            setUnlinkedUsers(response.data);
        } catch {
            setUnlinkedUsers([]);
        }
    };

    useEffect(() => {
        if (facultyId) {
            fetchFacultyDetails();
            fetchUsers();
        }
    }, [facultyId]);

    const handleAssignUser = async (selectedUserId: string) => {
        await api.patch(`/faculty/${facultyId}/assign-user`, {
            userId: selectedUserId,
        });
        await fetchFacultyDetails();
    };

    const handleDeleteFaculty = async () => {
        try {
            setDeleting(true);
            setDeleteError("");

            await api.delete(`/faculty/${facultyId}`);
            router.push("/faculty");
        } catch (err: any) {
            setDeleteError(
                err?.response?.data?.message ||
                "Failed to delete faculty member. Please try again.",
            );
            setDeleting(false);
        }
    };

    if (loading) {
        return <FacultyDetailSkeleton />;
    }

    if (error || !faculty) {
        return (
            <main className="min-h-full bg-zinc-50 py-12 dark:bg-zinc-950">
                <div className="mx-auto max-w-xl px-4 text-center">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-sm bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
                        Faculty Member Not Found
                    </h1>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        {error || "The requested faculty details could not be retrieved."}
                    </p>
                    <div className="mt-6 flex items-center justify-center gap-3">
                        <Link
                            href="/faculty"
                            className="inline-flex items-center gap-2 rounded-sm border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Faculty
                        </Link>
                        <button
                            type="button"
                            onClick={fetchFacultyDetails}
                            className="inline-flex items-center gap-2 rounded-sm bg-[#082B66] px-4 py-2 text-sm font-medium text-white hover:bg-[#082B66]/90 dark:bg-orange-400 dark:text-zinc-950 dark:hover:bg-orange-300"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Retry
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    // Determine user account object and ID safely
    const userAccount =
        typeof faculty.user === "object" && faculty.user !== null
            ? (faculty.user as User & { _id?: string })
            : null;

    const currentUserId = userAccount
        ? getUserId(userAccount)
        : typeof faculty.user === "string"
            ? faculty.user
            : "";

    const departmentName =
        typeof faculty.department === "object" && faculty.department !== null
            ? faculty.department.name
            : "Unassigned";

    return (
        <main className="min-h-full bg-zinc-50 dark:bg-zinc-950">
            <div className="mx-auto max-w-400 px-4 py-6 sm:px-6 lg:px-8">
                {/* Navigation & Action Bar */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                        href="/faculty"
                        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-[#082B66] dark:text-zinc-400 dark:hover:text-orange-400"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Faculty List
                    </Link>
                    <RequireRoleInline role="admin">
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsAssignModalOpen(true)}
                                className="inline-flex items-center gap-2 rounded-sm border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                                <UserPlus className="h-4 w-4 text-zinc-500" />
                                {userAccount ? "Reassign User" : "Assign User"}
                            </button>

                            <Link
                                href={`/faculty/${faculty._id}/edit`}
                                className="inline-flex items-center gap-2 rounded-sm bg-[#082B66] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[#082B66]/90 dark:bg-orange-400 dark:text-zinc-950 dark:hover:bg-orange-300"
                            >
                                <Pencil className="h-4 w-4" />
                                Edit Faculty
                            </Link>

                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="inline-flex items-center gap-2 rounded-sm border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-900/40"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </button>
                        </div>
                    </RequireRoleInline>
                </div>

                {/* Profile Card */}
                <div className="mb-6 rounded-sm border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                            {/* Profile Avatar / Image */}
                            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-sm border border-zinc-200 bg-zinc-100 dark:border-zinc-800">
                                {userAccount?.profileImage ? (
                                    <Image
                                        src={userAccount.profileImage}
                                        alt={faculty.name}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-[#082B66]/10 text-2xl font-bold text-[#082B66] dark:bg-[#082B66]/30 dark:text-orange-400">
                                        {getInitials(faculty.name)}
                                    </div>
                                )}
                            </div>

                            {/* Basic Info */}
                            <div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                        {faculty.name}
                                    </h1>
                                    <span className="rounded-sm bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                        {faculty.staffNo || "No Staff No."}
                                    </span>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#082B66]/10 px-3 py-1 text-xs font-medium text-[#082B66] dark:bg-[#082B66]/30 dark:text-orange-400">
                                        <Building className="h-3.5 w-3.5" />
                                        {departmentName}
                                    </span>

                                    {userAccount ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-sm bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                            <UserCheck className="h-3.5 w-3.5" />
                                            Linked to Account
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 rounded-sm bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                            <UserX className="h-3.5 w-3.5" />
                                            Unlinked User
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details Layout */}
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Main Info */}
                    <div className="space-y-6 md:col-span-2">
                        {/* Qualification & Expertise */}
                        <div className="rounded-sm border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                                Academic & Professional Details
                            </h2>

                            <div className="mt-5 space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
                                        <GraduationCap className="h-4 w-4" />
                                        Qualification
                                    </div>
                                    <p className="mt-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                        {faculty.qualification || "—"}
                                    </p>
                                </div>

                                <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
                                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
                                        <Briefcase className="h-4 w-4" />
                                        Expertise
                                    </div>
                                    <p className="mt-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                        {faculty.expertise || "—"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Description / Bio */}
                        <div className="rounded-sm border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                                Description / Overview
                            </h2>
                            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                                {faculty.description || "No description available."}
                            </p>
                        </div>

                        {/* Associated Documents Section */}
                        {currentUserId ? (
                            <MyDocuments userId={currentUserId} />
                        ) : (
                            <div className="rounded-sm border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    No linked user account available to fetch associated documents.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar - Linked Account */}
                    <div className="space-y-6">
                        <div className="rounded-sm border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                                Linked Account
                            </h2>

                            {userAccount ? (
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <span className="text-xs font-medium uppercase text-zinc-400">
                                            Account Name
                                        </span>
                                        <p className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-white">
                                            {userAccount.name}
                                        </p>
                                    </div>

                                    <div>
                                        <span className="text-xs font-medium uppercase text-zinc-400">
                                            Email Address
                                        </span>
                                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                                            <Mail className="h-3.5 w-3.5 text-zinc-400" />
                                            {userAccount.email}
                                        </p>
                                    </div>

                                    <div>
                                        <span className="text-xs font-medium uppercase text-zinc-400">
                                            System Role
                                        </span>
                                        <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium capitalize text-zinc-800 dark:text-zinc-200">
                                            <Shield className="h-3.5 w-3.5 text-[#082B66] dark:text-orange-400" />
                                            {userAccount.role}
                                        </p>
                                    </div>

                                    {/* View Profile Link */}
                                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                        <Link
                                            href={`/users/${currentUserId}`}
                                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#082B66] hover:underline dark:text-orange-400"
                                        >
                                            <UserIcon className="h-3.5 w-3.5" />
                                            View Profile
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 py-4 text-center">
                                    <UserIcon className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                        No system account attached. Assign a user account to grant access.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setIsAssignModalOpen(true)}
                                        className="mt-4 inline-flex items-center gap-2 rounded-sm bg-[#082B66] px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-[#082B66]/90 dark:bg-orange-400 dark:text-zinc-950 dark:hover:bg-orange-300"
                                    >
                                        <UserPlus className="h-3.5 w-3.5" />
                                        Assign User
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Assign / Reassign User Modal */}
            <AssignUserModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                onSubmit={handleAssignUser}
                users={unlinkedUsers}
                facultyName={faculty.name}
                currentUserId={currentUserId}
                isReassign={!!userAccount}
            />

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-sm border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                            Delete Faculty Member
                        </h3>
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                            Are you sure you want to delete{" "}
                            <strong className="text-zinc-800 dark:text-zinc-200">
                                {faculty.name}
                            </strong>
                            ? This action cannot be undone.
                        </p>

                        {deleteError && (
                            <div className="mt-4 rounded-sm bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                {deleteError}
                            </div>
                        )}

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="rounded-sm border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteFaculty}
                                disabled={deleting}
                                className="inline-flex items-center gap-2 rounded-sm bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleting ? "Deleting..." : "Delete Faculty"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}