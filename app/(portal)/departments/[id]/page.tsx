"use client";

import {
    ArrowLeft,
    Award,
    BookOpen,
    Building2,
    FileText,
    Hash,
    Mail,
    Pencil,
    UserRound,
    Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { departmentApi, Department } from "@/app/types/department";
import { Faculty as FacultyType } from "@/app/types/faculty";
import RequireRoleInline from "@/app/components/navigation/RequiredRoleInline";

export default function DepartmentDetailsPage() {
    const router = useRouter();
    const params = useParams();

    const id = params.id as string;

    const [department, setDepartment] = useState<Department | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchDepartment = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await departmentApi.getById(id);

                setDepartment(response.data);
            } catch (err: any) {
                console.error("Failed to fetch department:", err);

                setError(
                    err?.response?.data?.message ||
                    "Failed to load department."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchDepartment();
    }, [id]);

    if (loading) {
        return <DepartmentDetailsSkeleton />;
    }

    if (error || !department) {
        return (
            <main className="min-h-full p-4 sm:p-6 lg:p-8">
                <div className="mx-auto max-w-400">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="
                            mb-6 inline-flex items-center gap-2
                            text-sm font-medium
                            text-zinc-600 transition
                            hover:text-[#082B66]
                            dark:text-zinc-400
                            dark:hover:text-orange-400
                        "
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Departments
                    </button>

                    <div
                        className="
                            rounded-sm border border-red-200
                            bg-red-50 p-6
                            dark:border-red-900/50
                            dark:bg-red-950/20
                        "
                    >
                        <h1 className="text-lg font-semibold text-red-700 dark:text-red-400">
                            Department not found
                        </h1>

                        <p className="mt-2 text-sm text-red-600 dark:text-red-400/80">
                            {error || "The requested department could not be found."}
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    const faculty = (department.faculty ?? []) as unknown as FacultyType[];

    return (
        <main className="min-h-full p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-400">
                {/* Back */}
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="
                        mb-6 inline-flex items-center gap-2
                        text-sm font-medium
                        text-zinc-600 transition
                        hover:text-[#082B66]
                        dark:text-zinc-400
                        dark:hover:text-orange-400
                    "
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Departments
                </button>

                {/* Header */}
                <section
                    className="
                        overflow-hidden rounded-sm
                        border border-zinc-200 bg-white
                        shadow-sm
                        dark:border-zinc-800 dark:bg-zinc-900
                    "
                >
                    <div
                        className="
                            border-b border-zinc-100 p-6
                            dark:border-zinc-800
                            sm:p-8
                        "
                    >
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                            {/* Icon */}
                            <div
                                className="
                                    flex h-20 w-20 shrink-0
                                    items-center justify-center
                                    overflow-hidden rounded-sm
                                    bg-[#082B66]/10
                                    dark:bg-white/60
                                    p-1
                                    shadow-sm
                                "
                            >
                                {department.iconLink ? (
                                    <img
                                        src={department.iconLink}
                                        alt={department.name}
                                        className="h-full w-full object-cover "
                                    />
                                ) : (
                                    <Building2 className="h-9 w-9 text-orange-400" />
                                )}
                            </div>

                            {/* Name */}
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
                                    Department
                                </p>

                                <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                                    {department.name}
                                </h1>

                                {department.description && (
                                    <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                                        {department.description}
                                    </p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                                <RequireRoleInline role="admin">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.push(`/departments/${department._id}/edit`)
                                        }
                                        className="
                                        inline-flex items-center justify-center gap-2
                                        rounded-sm border border-zinc-200
                                        bg-white px-4 py-2.5
                                        text-sm font-medium text-zinc-700
                                        transition-all
                                        hover:border-[#082B66]
                                        hover:bg-[#082B66]
                                        hover:text-white
                                        dark:border-zinc-700
                                        dark:bg-zinc-900
                                        dark:text-zinc-300
                                        dark:hover:border-orange-400
                                        dark:hover:bg-orange-400
                                        dark:hover:text-zinc-950
                                    "
                                    >
                                        <Pencil className="h-4 w-4" />
                                        Edit Department
                                    </button>
                                </RequireRoleInline>

                                <button
                                    type="button"
                                    onClick={() =>
                                        router.push(`/courses?department=${department._id}`)
                                    }
                                    className="
                                        inline-flex items-center justify-center gap-2
                                        rounded-sm
                                        bg-[#082B66] px-4 py-2.5
                                        text-sm font-medium text-white
                                        shadow-sm
                                        transition-all
                                        hover:bg-[#0F4C9C]
                                        hover:shadow-md
                                        dark:bg-orange-400
                                        dark:text-zinc-950
                                        dark:hover:bg-orange-300
                                    "
                                >
                                    <BookOpen className="h-4 w-4" />
                                    See Courses
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-1 divide-y divide-zinc-100 dark:divide-zinc-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                        <SummaryItem
                            icon={Users}
                            label="Faculty Members"
                            value={faculty.length}
                        />

                        <SummaryItem
                            icon={UserRound}
                            label="Head of Department"
                            value={department.hod?.name || "Not assigned"}
                        />
                    </div>
                </section>

                {/* Department Information */}
                <div className="mt-6 ">
                    {/* Faculty */}
                    <section
                        className="
                            rounded-sm border border-zinc-200
                            bg-white shadow-sm
                            dark:border-zinc-800 dark:bg-zinc-900
                            lg:col-span-2
                        "
                    >
                        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                            <div>
                                <h2 className="font-semibold text-zinc-900 dark:text-white">
                                    Faculty
                                </h2>

                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                    {faculty.length} member
                                    {faculty.length === 1 ? "" : "s"}
                                </p>
                            </div>

                            <Users className="h-5 w-5 text-[#082B66] dark:text-orange-400" />
                        </div>

                        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {faculty.length > 0 ? (
                                faculty.map((member) => (
                                    <FacultyRow
                                        key={member._id}
                                        member={member}
                                    />
                                ))
                            ) : (
                                <div className="p-6 text-center">
                                    <Users className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" />

                                    <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                                        No faculty members assigned.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}

interface SummaryItemProps {
    icon: React.ElementType;
    label: string;
    value: string | number;
}

function SummaryItem({
    icon: Icon,
    label,
    value,
}: SummaryItemProps) {
    return (
        <div className="flex items-center gap-4 p-5 sm:p-6">
            <div
                className="
                    flex h-11 w-11 shrink-0 items-center
                    justify-center rounded-sm
                    bg-[#082B66]/10
                    dark:bg-[#082B66]/30
                "
            >
                <Icon className="h-5 w-5 text-[#082B66] dark:text-orange-400" />
            </div>

            <div className="min-w-0">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {label}
                </p>

                <p className="mt-1 truncate text-sm font-semibold text-zinc-900 dark:text-white">
                    {value}
                </p>
            </div>
        </div>
    );
}

interface FacultyRowProps {
    member: FacultyType;
}

function FacultyRow({ member }: FacultyRowProps) {
    return (
        <div className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 min-w-0">
                <div
                    className="
                        flex h-10 w-10 shrink-0 items-center
                        justify-center rounded-full
                        bg-zinc-100
                        dark:bg-zinc-800
                    "
                >
                    <UserRound className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                            {member.name || "Unnamed faculty member"}
                        </p>

                        {member.staffNo && (
                            <span className="inline-flex items-center gap-1 rounded-sm bg-zinc-100 px-2 py-0.5 text-xs font-mono text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                <Hash className="h-3 w-3" />
                                {member.staffNo}
                            </span>
                        )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                        {member.qualification && (
                            <span className="inline-flex items-center gap-1">
                                <Award className="h-3.5 w-3.5 text-orange-400" />
                                {member.qualification}
                            </span>
                        )}

                        {member.expertise && (
                            <span>• Expertise: {member.expertise}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Badges / Extras */}
            <div className="flex items-center gap-3 shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                {member.courses && member.courses.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#082B66] dark:bg-blue-950/40 dark:text-blue-300">
                        <BookOpen className="h-3 w-3" />
                        {member.courses.length} {member.courses.length === 1 ? "course" : "courses"}
                    </span>
                )}

                {member.documents && member.documents.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        <FileText className="h-3 w-3" />
                        {member.documents.length}
                    </span>
                )}
            </div>
        </div>
    );
}

function DepartmentDetailsSkeleton() {
    return (
        <main className="min-h-full p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-400 animate-pulse">
                <div className="mb-6 h-5 w-40 rounded-sm bg-zinc-200 dark:bg-zinc-800" />

                <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                            <div className="h-20 w-20 shrink-0 rounded-sm bg-zinc-200 dark:bg-zinc-800" />

                            <div className="flex-1">
                                <div className="h-3 w-24 rounded-sm bg-zinc-200 dark:bg-zinc-800" />

                                <div className="mt-3 h-8 w-2/3 rounded-sm bg-zinc-200 dark:bg-zinc-800" />

                                <div className="mt-4 h-4 w-full max-w-2xl rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2">
                        <div className="h-24 border-t border-zinc-100 dark:border-zinc-800" />
                        <div className="h-24 border-t border-zinc-100 dark:border-zinc-800" />
                    </div>
                </section>

                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="h-40 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-64 rounded-sm bg-zinc-200 dark:bg-zinc-800 lg:col-span-2" />
                </div>
            </div>
        </main>
    );
}