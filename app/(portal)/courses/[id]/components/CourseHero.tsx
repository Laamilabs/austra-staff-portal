"use client";

import Link from "next/link";
import { Edit3, Star, Trash2 } from "lucide-react";

import { Course } from "@/app/types/courses";
import RequireRoleInline from "@/app/components/navigation/RequiredRoleInline";

interface CourseHeroProps {
    course: Course;
    isDeleting: boolean;
    onDelete: () => void;
}

export default function CourseHero({
    course,
    isDeleting,
    onDelete,
}: CourseHeroProps) {
    return (
        <section className="mt-5 overflow-hidden rounded-sm border-b-2 border-orange-400 bg-[#0B1E3D] shadow-sm">
            <div className="px-6 py-10 md:px-8 md:py-12">
                {/* Portal label */}
                <div className="mb-5 flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">
                        Course Management
                    </span>
                    <span className="h-px w-8 bg-orange-400/50" />
                </div>

                {/* Course badges */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-sm border border-white/10 bg-[#102544] px-2.5 py-1 font-mono text-xs font-bold tracking-wide text-white">
                        {course.courseCode}
                    </span>

                    {course.level && (
                        <span className="rounded-sm bg-orange-400 px-2.5 py-1 text-xs font-semibold text-[#0B1E3D]">
                            {course.level}
                        </span>
                    )}

                    {course.featured && (
                        <span className="inline-flex items-center gap-1 rounded-sm border border-orange-400/40 bg-orange-400/10 px-2.5 py-1 text-xs font-medium text-orange-400">
                            <Star size={12} fill="currentColor" />
                            Featured Course
                        </span>
                    )}
                </div>

                {/* Title */}
                <h1 className="mt-5 max-w-5xl text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">
                    {course.name}
                </h1>

                {/* Department */}
                <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-400">
                    <span>Department</span>
                    <span className="font-medium text-white">
                        {course.department?.name || "Not assigned"}
                    </span>
                </div>

                <RequireRoleInline role="admin">
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link
                            href={`/courses/${course._id}/edit`}
                            className="inline-flex items-center justify-center gap-2 rounded-sm bg-orange-400 px-5 py-2.5 text-sm font-bold text-[#0B1E3D] transition-all hover:bg-orange-500 active:translate-y-px"
                        >
                            <Edit3 size={16} />
                            Edit Course
                        </Link>

                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={isDeleting}
                            className="inline-flex items-center justify-center gap-2 rounded-sm border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Trash2 size={16} />
                            {isDeleting ? "Deleting..." : "Delete Course"}
                        </button>
                    </div>
                </RequireRoleInline>
            </div>
        </section>
    );
}