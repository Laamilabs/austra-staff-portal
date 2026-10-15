"use client";

import Link from "next/link";
import {
    ArrowLeft,
    CheckCircle2,
    Edit3,
    Star,
} from "lucide-react";

import { Course } from "@/app/types/courses";
import RequireRoleInline from "@/app/components/navigation/RequiredRoleInline";

interface CourseSidebarProps {
    course: Course;
}

export default function CourseSidebar({ course }: CourseSidebarProps) {
    return (
        <aside className="lg:col-span-1 lg:sticky lg:top-6 self-start space-y-6">
            {/* Course information */}
            <section className="rounded-sm border border-zinc-200 dark:border-zinc-800 border-t-4 border-t-orange-400 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                <h2 className="text-base font-bold text-[#0B1E3D] dark:text-white">
                    Course Information
                </h2>

                <div className="mt-5 divide-y divide-zinc-100 dark:divide-zinc-800">
                    <DetailRow label="Course code" value={course.courseCode} />
                    <DetailRow
                        label="Level"
                        value={course.level || "Not specified"}
                    />
                    <DetailRow
                        label="Duration"
                        value={course.duration || "Not specified"}
                    />
                    <DetailRow
                        label="Department"
                        value={course.department?.name || "Not assigned"}
                    />
                    <DetailRow
                        label="Featured"
                        value={course.featured ? "Yes" : "No"}
                    />
                </div>
            </section>

            {/* Status */}
            <section className="rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                <h2 className="text-base font-bold text-[#0B1E3D] dark:text-white">
                    Course Status
                </h2>

                <div className="mt-4 flex items-center gap-3 rounded-sm border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                            Active Course
                        </p>
                        <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400/80">
                            This course is currently available in the system.
                        </p>
                    </div>
                </div>

                {course.featured && (
                    <div className="mt-3 flex items-center gap-3 rounded-sm border border-orange-200 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/20 p-4">
                        <Star
                            size={18}
                            className="shrink-0 text-orange-500 dark:text-orange-400"
                            fill="currentColor"
                        />
                        <div>
                            <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                                Featured Course
                            </p>
                            <p className="mt-0.5 text-xs text-orange-700 dark:text-orange-400/80">
                                This course is marked as featured.
                            </p>
                        </div>
                    </div>
                )}
            </section>

            {/* Quick actions */}
            <section className="rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                <h2 className="text-base font-bold text-[#0B1E3D] dark:text-white">
                    Quick Actions
                </h2>

                <div className="mt-4 space-y-2">
                    <RequireRoleInline role="admin">
                        <Link
                            href={`/courses/${course._id}/edit`}
                            className="flex w-full items-center justify-center gap-2 rounded-sm bg-[#0B1E3D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#10294d] dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
                        >
                            <Edit3 size={15} />
                            Edit Course
                        </Link>
                    </RequireRoleInline>
                    <Link
                        href="/courses"
                        className="flex w-full items-center justify-center gap-2 rounded-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-[#0B1E3D] dark:text-zinc-100 transition-colors hover:border-orange-400 hover:text-orange-500 dark:hover:text-orange-400"
                    >
                        <ArrowLeft size={15} />
                        All Courses
                    </Link>
                </div>
            </section>

            {/* Timestamps */}
            {(course.createdAt || course.updatedAt) && (
                <section className="rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Record Information
                    </h2>

                    <div className="mt-4 space-y-3 text-xs text-zinc-400">
                        {course.createdAt && (
                            <div className="flex justify-between gap-4">
                                <span>Created</span>
                                <span className="font-medium text-zinc-600 dark:text-zinc-300">
                                    {new Date(course.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                        {course.updatedAt && (
                            <div className="flex justify-between gap-4">
                                <span>Updated</span>
                                <span className="font-medium text-zinc-600 dark:text-zinc-300">
                                    {new Date(course.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </aside>
    );
}

// ----------------------------------------------------------------------
// Small helper
// ----------------------------------------------------------------------
function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <span className="text-sm text-zinc-400">{label}</span>
            <span className="max-w-[60%] text-right text-sm font-semibold text-[#0B1E3D] dark:text-white">
                {value}
            </span>
        </div>
    );
}