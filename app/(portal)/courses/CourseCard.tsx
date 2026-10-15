"use client";

import React from "react";
import { Course } from "@/app/types/courses";
import Link from "next/link";
import { ArrowRight, Building2, Layers, Star } from "lucide-react";

interface CourseCardProps {
    course: Course;
    /** Optional search text; matches are highlighted in the code and title. */
    query?: string;
    /** Kept for compatibility with existing callers; the card no longer animates in. */
    animationDelay?: number;
}

/** Wraps matches of `query` in a highlight so you can see why a card appeared. */
function Highlight({ text, query }: { text: string; query?: string }) {
    const q = query?.trim();
    if (!q) return <>{text}</>;

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "ig"));

    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === q.toLowerCase() ? (
                    <mark
                        key={i}
                        className="rounded-sm bg-orange-400/25 px-0.5 text-inherit"
                    >
                        {part}
                    </mark>
                ) : (
                    <React.Fragment key={i}>{part}</React.Fragment>
                ),
            )}
        </>
    );
}

export default function CourseCard({ course, query }: CourseCardProps) {
    return (
        <article
            className="
                group relative flex h-full flex-col gap-3 rounded-sm border p-4 transition-colors
                border-zinc-200/80 bg-white/80 hover:border-[#0B1E3D]/40 hover:bg-white
                dark:border-white/10 dark:bg-white/4 dark:hover:border-orange-400/50 dark:hover:bg-white/8
                has-focus-visible:ring-2 has-focus-visible:ring-orange-400
            "
        >
            {/* Code + featured */}
            <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center rounded-sm bg-[#0B1E3D]/5 px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-[#0B1E3D] ring-1 ring-inset ring-[#0B1E3D]/10 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/25">
                    <Highlight text={course.courseCode} query={query} />
                </span>

                {course.featured && (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-orange-400/10 px-2 py-0.5 text-[11px] font-semibold text-orange-700 ring-1 ring-inset ring-orange-400/30 dark:text-orange-300">
                        <Star className="h-3 w-3 fill-orange-500 text-orange-500 dark:fill-orange-400 dark:text-orange-400" />
                        Featured
                    </span>
                )}
            </div>

            {/* Title: the whole card is the link target */}
            <h3 className="flex-1 text-sm font-semibold leading-snug text-[#0B1E3D] dark:text-white">
                <Link
                    href={`/courses/${course._id}`}
                    className="line-clamp-3 focus:outline-none"
                >
                    <span className="absolute inset-0" aria-hidden="true" />
                    <Highlight text={course.name} query={query} />
                </Link>
            </h3>

            {/* Meta: level + department */}
            <div className="flex flex-col gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                {course.department?.name && (
                    <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
                        <span className="truncate">
                            <Highlight text={course.department.name} query={query} />
                        </span>
                    </span>
                )}
                {course.level && (
                    <span className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                        <span className="truncate">
                            <Highlight text={course.level} query={query} />
                        </span>
                    </span>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-zinc-200/80 pt-3 text-xs font-medium text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <span className="transition-colors group-hover:text-[#0B1E3D] dark:group-hover:text-white">
                    View details
                </span>
                <ArrowRight className="h-4 w-4 text-zinc-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-orange-500 dark:text-zinc-600 dark:group-hover:text-orange-400" />
            </div>
        </article>
    );
}