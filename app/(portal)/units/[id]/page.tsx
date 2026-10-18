"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    BookOpen,
    AlertCircle,
    Loader2,
    GraduationCap,
    FileText,
    Tag,
    Edit3,
    Trash2,
} from "lucide-react";

import { Unit, unitApi } from "@/app/types/units";
import { Course } from "@/app/types/courses";

export default function UnitDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [unit, setUnit] = useState<Unit | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Delete State
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

    // Load Unit Details
    useEffect(() => {
        if (!id) return;

        async function fetchUnit() {
            try {
                setLoading(true);
                const response = await unitApi.getById(id);
                setUnit(response.data);
            } catch (err: any) {
                console.error("Failed to fetch unit:", err);
                setError(err.response?.data?.message || "Failed to load unit details.");
            } finally {
                setLoading(false);
            }
        }

        fetchUnit();
    }, [id]);

    const handleDelete = async () => {
        if (!id) return;

        try {
            setIsDeleting(true);
            await unitApi.delete(id);
            router.push("/units");
            router.refresh();
        } catch (err: any) {
            console.error("Failed to delete unit:", err);
            setError(err.response?.data?.message || "Failed to delete unit.");
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const getCourseName = (courseRef?: Course | string) => {
        if (!courseRef) return "N/A";
        if (typeof courseRef === "object" && courseRef !== null) {
            return courseRef.name || courseRef._id;
        }
        return courseRef;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-100 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#082B66] dark:text-orange-400" />
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Loading unit details...</p>
            </div>
        );
    }

    if (error && !unit) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-full mx-auto space-y-4">
                <Link
                    href="/units"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Units
                </Link>
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm flex items-start gap-3 shadow-sm dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400">
                    <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5 dark:text-red-400" />
                    <p className="text-sm font-medium">{error || "Unit not found."}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-full mx-auto space-y-6">
            {/* Navigation & Actions */}
            <div>
                <Link
                    href="/units"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors mb-3 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Units
                </Link>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#082B66]/10 text-[#082B66] rounded-sm border border-[#082B66]/20 shadow-sm dark:bg-orange-400/10 dark:text-orange-400 dark:border-orange-400/20">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                                    {unit?.name}
                                </h1>
                                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-sm bg-[#082B66]/10 text-[#082B66] border border-[#082B66]/20 dark:bg-orange-400/10 dark:text-orange-400 dark:border-orange-400/20">
                                    {unit?.code}
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                                Associated with {getCourseName(unit?.courseId)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Link
                            href={`/units/${id}/edit`}
                            className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 px-3.5 py-2 rounded-sm text-xs sm:text-sm font-medium transition-all shadow-xs dark:bg-zinc-900 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300"
                        >
                            <Edit3 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                            Edit
                        </Link>
                        <button
                            type="button"
                            onClick={() => setShowDeleteModal(true)}
                            className="flex items-center gap-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 px-3.5 py-2 rounded-sm text-xs sm:text-sm font-medium transition-all shadow-xs dark:bg-zinc-900 dark:border-red-900/50 dark:hover:bg-red-950/30 dark:text-red-400"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Notification */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm flex items-start gap-3 shadow-sm animate-in fade-in duration-200 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400">
                    <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5 dark:text-red-400" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Content View */}
            <div className="bg-white border border-zinc-200 rounded-sm shadow-sm p-4 sm:p-6 lg:p-8 space-y-6 dark:bg-zinc-900 dark:border-zinc-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                    {/* Course Association */}
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 dark:text-zinc-400">
                            <GraduationCap className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                            Associated Course
                        </span>
                        <p className="text-base font-semibold text-zinc-900 dark:text-white">
                            {getCourseName(unit?.courseId)}
                        </p>
                    </div>

                    {/* Unit Type */}
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 dark:text-zinc-400">
                            <Tag className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                            Unit Type
                        </span>
                        <div>
                            {unit?.optionalUnit ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                                    Elective / Optional Unit
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium bg-[#082B66]/10 text-[#082B66] border border-[#082B66]/20 dark:bg-orange-400/10 dark:text-orange-400 dark:border-orange-400/20">
                                    Mandatory Core Unit
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Unit Code */}
                <div className="space-y-1">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider dark:text-zinc-400">
                        Unit Code
                    </span>
                    <p className="font-mono text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        {unit?.code}
                    </p>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 dark:text-zinc-400">
                        <FileText className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                        Description
                    </span>
                    <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap bg-zinc-50 p-4 rounded-sm border border-zinc-100 dark:text-zinc-300 dark:bg-zinc-800/50 dark:border-zinc-800">
                        {unit?.description || "No description provided for this unit."}
                    </p>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-sm max-w-md w-full p-6 space-y-4 shadow-xl border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800">
                        <div className="p-3 bg-red-100 text-red-600 rounded-sm w-fit dark:bg-red-950/50 dark:text-red-400">
                            <Trash2 className="w-6 h-6" />
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                                Delete Unit
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Are you sure you want to delete{" "}
                                <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                                    "{unit?.name}"
                                </span>{" "}
                                ({unit?.code})? This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-sm transition-colors dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleDelete}
                                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-sm text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Delete Unit"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}