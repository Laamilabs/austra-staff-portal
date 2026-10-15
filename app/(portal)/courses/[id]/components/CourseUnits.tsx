"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, Plus } from "lucide-react";

import { Unit } from "@/app/types/units";
import RequireRoleInline from "@/app/components/navigation/RequiredRoleInline";

interface CourseUnitsProps {
    courseId: string;
    units: Unit[];
    isLoading: boolean;
}

export default function CourseUnits({
    courseId,
    units,
    isLoading,
}: CourseUnitsProps) {
    const router = useRouter();

    return (
        <section className="rounded-sm border border-zinc-200 dark:border-zinc-800 border-t-4 border-t-[#0B1E3D] dark:border-t-orange-400 bg-white dark:bg-zinc-900 p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D]/5 dark:bg-white/10 text-[#0B1E3D] dark:text-orange-400">
                        <Layers size={18} />
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-[#0B1E3D] dark:text-white">
                            Course Units
                        </h2>
                        <p className="mt-0.5 text-xs text-zinc-400">
                            Units offered under this course
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    {!isLoading && (
                        <span className="rounded-sm bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                            {units.length} {units.length === 1 ? "Unit" : "Units"}
                        </span>
                    )}

                    <RequireRoleInline role="admin">
                        <Link
                            href={`/units/new?courseId=${courseId}`}
                            className="inline-flex items-center gap-1.5 rounded-sm bg-[#0B1E3D] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#10294d] dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Unit
                        </Link>
                    </RequireRoleInline>
                </div>
            </div>

            {isLoading ? (
                <div className="mt-6 space-y-3">
                    <div className="h-14 animate-pulse rounded-sm bg-zinc-100 dark:bg-zinc-800/60" />
                    <div className="h-14 animate-pulse rounded-sm bg-zinc-100 dark:bg-zinc-800/60" />
                </div>
            ) : units.length > 0 ? (
                <div className="mt-6 divide-y divide-zinc-100 dark:divide-zinc-800 rounded-sm border border-zinc-200 dark:border-zinc-800">
                    {units.map((unit) => {
                        const target = `/units/${unit._id}/edit?courseId=${courseId}`;

                        return (
                            <div
                                key={unit._id}
                                role="button"
                                tabIndex={0}
                                onClick={() => router.push(target)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        router.push(target);
                                    }
                                }}
                                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer focus:outline-none focus-visible:bg-zinc-50 dark:focus-visible:bg-zinc-800/30"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                                            {unit.code}
                                        </span>
                                        <h3 className="text-sm font-semibold text-[#0B1E3D] dark:text-white">
                                            {unit.name}
                                        </h3>
                                    </div>
                                    {unit.description && (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                                            {unit.description}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-center">
                                    {unit.type && (
                                        <span className="rounded-sm border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                                            {unit.type}
                                        </span>
                                    )}
                                    {unit.optionalUnit && (
                                        <span className="rounded-sm bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                                            Optional
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="mt-6 rounded-sm border border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 p-6 text-center">
                    <p className="text-sm text-zinc-400">
                        No units have been added to this course yet.
                    </p>
                </div>
            )}
        </section>
    );
}