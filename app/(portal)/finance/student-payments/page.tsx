
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { studentFeeApi, type StudentFee } from "@/app/types/student-fee";
import { studentApi, type Student } from "@/app/types/students";
import {
    feeStructureApi,
    type FeeStructure,
} from "@/app/types/fee-structure";

const NAVY = "#1e3a5f";
const ORANGE = "#f59e0b";

function getId(value: { _id: string } | string | null | undefined): string {
    if (!value) return "";
    return typeof value === "string" ? value : value._id;
}

function studentName(student?: Student): string {
    if (!student) return "Unknown student";
    const { firstName, middleName, lastName } = student.fullName;
    return [firstName, middleName, lastName].filter(Boolean).join(" ");
}

function money(amount: number, currency = "KES") {
    return new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
}

function statusClass(status: StudentFee["status"]) {
    switch (status) {
        case "COMPLETED":
            return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
        case "CANCELLED":
            return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
        default:
            return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
    }
}

export default function StudentPaymentsPage() {
    const [fees, setFees] = useState<StudentFee[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [structures, setStructures] = useState<FeeStructure[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [feeRows, studentResponse, structureRows] =
                await Promise.all([
                    studentFeeApi.getAll(),
                    studentApi.getAll(),
                    feeStructureApi.getAll(),
                ]);

            setFees(feeRows);
            setStudents(studentResponse.data);
            setStructures(structureRows);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Could not load student fee assignments.",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const studentMap = useMemo(
        () => new Map(students.map((student) => [student._id, student])),
        [students],
    );

    const structureMap = useMemo(
        () => new Map(structures.map((structure) => [structure._id, structure])),
        [structures],
    );

    const groupedFees = useMemo(() => {
        const groups = new Map<
            string,
            { student?: Student; fees: StudentFee[] }
        >();

        for (const fee of fees) {
            const id = getId(fee.studentId);
            if (!id) continue;

            if (!groups.has(id)) {
                groups.set(id, {
                    student: studentMap.get(id),
                    fees: [],
                });
            }

            groups.get(id)!.fees.push(fee);
        }

        const query = search.trim().toLowerCase();

        return Array.from(groups.entries())
            .map(([studentId, group]) => ({
                studentId,
                ...group,
                fees: group.fees.slice().sort((a, b) =>
                    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
                ),
            }))
            .filter(({ studentId, student, fees: rows }) => {
                if (!query) return true;

                const haystack = [
                    studentId,
                    studentName(student),
                    student?.contact?.email ?? "",
                    ...rows.map((fee) => {
                        const structure = structureMap.get(
                            getId(fee.feeStructureId),
                        );
                        return structure?.name ?? "";
                    }),
                ]
                    .join(" ")
                    .toLowerCase();

                return haystack.includes(query);
            })
            .sort((a, b) =>
                studentName(a.student).localeCompare(studentName(b.student)),
            );
    }, [fees, search, studentMap, structureMap]);

    const activeFees = fees.filter((fee) => fee.status !== "CANCELLED");
    const totalAssessed = activeFees.reduce(
        (sum, fee) => sum + fee.totalAmount,
        0,
    );
    const totalPaid = activeFees.reduce(
        (sum, fee) => sum + fee.amountPaid,
        0,
    );
    const totalBalance = activeFees.reduce(
        (sum, fee) => sum + Math.max(0, fee.totalAmount - fee.amountPaid),
        0,
    );

    return (
        <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
            <nav className="mb-3 flex gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Link href="/finance" className="hover:text-amber-500">
                    Finance
                </Link>
                <span>/</span>
                <span>Student payments</span>
            </nav>

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                        Finance management
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                        Student fees
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Fee assignments grouped by student.
                    </p>
                </div>

                <Link
                    href="/finance/student-payments/new"
                    className="inline-flex items-center justify-center rounded-sm px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                    style={{ backgroundColor: NAVY }}
                >
                    <span className="mr-2 text-lg" aria-hidden>+</span>
                    Assign fee structure
                </Link>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
                {[
                    { label: "Total assessed", value: money(totalAssessed) },
                    { label: "Total paid", value: money(totalPaid) },
                    { label: "Outstanding balance", value: money(totalBalance) },
                ].map((item) => (
                    <section
                        key={item.label}
                        className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                    >
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {item.label}
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                            {item.value}
                        </p>
                    </section>
                ))}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by student, email or fee structure..."
                    className="w-full rounded-sm border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <button
                    type="button"
                    onClick={() => void loadData()}
                    disabled={loading}
                    className="rounded-sm border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                    Refresh
                </button>
            </div>

            {error && (
                <div
                    role="alert"
                    className="mt-5 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                >
                    {error}
                </div>
            )}

            {loading ? (
                <div className="py-16 text-center text-sm text-slate-500">
                    Loading student fee assignments…
                </div>
            ) : groupedFees.length === 0 ? (
                <section className="mt-6 rounded-md border border-dashed border-slate-300 px-6 py-16 text-center dark:border-slate-700">
                    <h2 className="font-medium text-slate-900 dark:text-white">
                        No student fee assignments found
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Assign a fee structure to an enrolled student to get started.
                    </p>
                    <Link
                        href="/finance/student-payments/new"
                        className="mt-5 inline-flex rounded-sm px-4 py-2 text-sm font-medium text-white"
                        style={{ backgroundColor: NAVY }}
                    >
                        Assign a fee structure
                    </Link>
                </section>
            ) : (
                <div className="mt-6 space-y-5">
                    {groupedFees.map(({ studentId, student, fees: rows }) => (
                        <section
                            key={studentId}
                            className="overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                        >
                            <header className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-950/50">
                                <div>
                                    <h2 className="font-semibold text-slate-900 dark:text-white">
                                        {studentName(student)}
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Student ID: {studentId}
                                        {student?.contact?.email
                                            ? ` · ${student.contact.email}`
                                            : ""}
                                    </p>
                                </div>
                                <div className="text-sm text-slate-500">
                                    {rows.length} assignment{rows.length === 1 ? "" : "s"}
                                </div>
                            </header>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-left text-sm">
                                    <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                        <tr>
                                            <th className="px-5 py-3 font-medium">Course</th>
                                            <th className="px-5 py-3 font-medium">Fee structure</th>
                                            <th className="px-5 py-3 text-right font-medium">Assessed</th>
                                            <th className="px-5 py-3 text-right font-medium">Paid</th>
                                            <th className="px-5 py-3 text-right font-medium">Balance</th>
                                            <th className="px-5 py-3 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {rows.map((fee) => {
                                            const structure = structureMap.get(
                                                getId(fee.feeStructureId),
                                            );
                                            const courseId = getId(fee.courseId);
                                            const course =
                                                structure &&
                                                    typeof structure.courseId === "object"
                                                    ? structure.courseId
                                                    : undefined;
                                            const balance = Math.max(
                                                0,
                                                fee.totalAmount - fee.amountPaid,
                                            );

                                            return (
                                                <tr key={fee._id}>
                                                    <td className="px-5 py-4">
                                                        <p className="font-medium text-slate-800 dark:text-slate-100">
                                                            {course?.name ?? "Course"}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {course?.courseCode ?? courseId}
                                                        </p>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <p className="font-medium text-slate-800 dark:text-slate-100">
                                                            {structure?.name ?? "Fee structure"}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {fee.createdAt
                                                                ? new Date(fee.createdAt).toLocaleDateString("en-KE")
                                                                : "Date unavailable"}
                                                        </p>
                                                    </td>
                                                    <td className="px-5 py-4 text-right tabular-nums">
                                                        {money(fee.totalAmount, fee.currency)}
                                                    </td>
                                                    <td className="px-5 py-4 text-right tabular-nums">
                                                        {money(fee.amountPaid, fee.currency)}
                                                    </td>
                                                    <td className="px-5 py-4 text-right font-medium tabular-nums">
                                                        {money(balance, fee.currency)}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(fee.status)}`}>
                                                            {fee.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    ))}
                </div>
            )}

            <div
                className="mt-8 h-1 w-20 rounded-full"
                style={{ backgroundColor: ORANGE }}
            />
        </main>
    );
}
