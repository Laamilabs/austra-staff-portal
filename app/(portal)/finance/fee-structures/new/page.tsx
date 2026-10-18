// app/(portal)/finance/fee-structures/new/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
    feeStructureApi,
    type CreateFeeItemDto,
} from "@/app/types/fee-structure";
import SelectCourse from "@/app/(portal)/courses/selectCourse";
import type { Course } from "@/app/types/courses";

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
//
// Both colors appear in both themes. Navy = structure, orange = accent.
//
const NAVY = "#1e3a5f";
const NAVY_HOVER = "#16304f";
const NAVY_LIGHT = "#93b4dc"; // navy tint for dark mode text
const ORANGE = "#f59e0b";
const ORANGE_HOVER = "#d97706";
const ORANGE_DEEP = "#b45309"; // orange text on light backgrounds

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CURRENCIES = ["KES", "USD", "EUR", "GBP"] as const;
type Currency = (typeof CURRENCIES)[number];

const GENERIC_BUCKETS: ReadonlyArray<{
    name: string;
    weight: number;
    description?: string;
}> = [
        { name: "Tuition", weight: 65, description: "Core instruction" },
        { name: "Examination fees", weight: 10, description: "Internal & board exams" },
        { name: "Library & resources", weight: 8, description: "Library and e-resources" },
        { name: "Activity fees", weight: 7, description: "Clubs, sports, events" },
        { name: "Medical & insurance", weight: 5, description: "Student cover" },
        { name: "Administrative fees", weight: 5, description: "Registration & records" },
    ];

interface DraftItem extends CreateFeeItemDto {
    /** Local-only key for React row identity. */
    key: string;
    /**
     * `"generated"` rows are owned by the quick-generator and will be rebuilt
     * when it re-runs. `"manual"` rows are owned by the user and are always
     * preserved, regardless of regeneration.
     */
    origin: "manual" | "generated";
}

interface Inclusion extends CreateFeeItemDto {
    key: string;
}

function uid(): string {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
}

function newItem(origin: DraftItem["origin"] = "manual"): DraftItem {
    return { key: uid(), name: "", amount: 0, description: "", origin };
}

function newInclusion(): Inclusion {
    return { key: uid(), name: "", amount: 0, description: "" };
}

function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

function splitByWeight(
    pool: number,
    buckets: ReadonlyArray<{ weight: number }>,
): number[] {
    const totalWeight = buckets.reduce((s, b) => s + b.weight, 0);
    if (totalWeight <= 0 || pool <= 0) return buckets.map(() => 0);

    const cents = Math.round(pool * 100);
    const raw = buckets.map((b) => (b.weight / totalWeight) * cents);
    const floored = raw.map((r) => Math.floor(r));
    let remainder = cents - floored.reduce((s, n) => s + n, 0);

    const order = raw
        .map((r, i) => ({ i, frac: r - Math.floor(r) }))
        .sort((a, b) => b.frac - a.frac);

    const result = floored.slice();
    let k = 0;
    while (remainder > 0 && order.length > 0) {
        result[order[k % order.length].i] += 1;
        remainder -= 1;
        k += 1;
    }
    return result.map((c) => c / 100);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewFeeStructurePage() {
    const router = useRouter();

    const [courseId, setCourseId] = useState("");
    const [, setCourse] = useState<Course | undefined>(undefined);
    const [name, setName] = useState("");
    const [currency, setCurrency] = useState<Currency>("KES");
    const [isActive, setIsActive] = useState(true);
    const [items, setItems] = useState<DraftItem[]>([newItem()]);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Quick-generator state
    const [total, setTotal] = useState("");
    const [inclusions, setInclusions] = useState<Inclusion[]>([]);

    /**
     * Snapshot of the generator inputs at the moment the last generation ran.
     * `null` means the generator has never run.
     *
     * The button is enabled whenever the current inputs differ from this
     * snapshot — so editing the total or an inclusion always re-enables it,
     * no matter how many times the user has generated or edited.
     */
    const lastGeneratedSnapshot = useRef<string | null>(null);

    const parsedTotal = useMemo(() => {
        const n = Number(total);
        return Number.isFinite(n) && n > 0 ? n : 0;
    }, [total]);

    const inclusionsTotal = useMemo(
        () =>
            inclusions.reduce(
                (s, inc) => s + (Number.isFinite(inc.amount) ? inc.amount : 0),
                0,
            ),
        [inclusions],
    );

    const remainderForGenerics = useMemo(
        () => round2(Math.max(0, parsedTotal - inclusionsTotal)),
        [parsedTotal, inclusionsTotal],
    );

    /** A stable signature of the generator's *inputs*. */
    const inputsSignature = useMemo(() => {
        const inc = inclusions
            .map(
                (i) =>
                    `${i.name.trim()}|${Number(i.amount) || 0}|${(i.description ?? "").trim()}`,
            )
            .join("§");
        return `${parsedTotal}::${currency}::${inc}`;
    }, [parsedTotal, currency, inclusions]);

    const hasGenerated = lastGeneratedSnapshot.current !== null;
    const isStale =
        hasGenerated && lastGeneratedSnapshot.current !== inputsSignature;

    const canGenerate =
        parsedTotal > 0 && inclusionsTotal <= parsedTotal;

    // ---------------------------------------------------------------------
    // Row handlers
    // ---------------------------------------------------------------------

    function updateItem(key: string, patch: Partial<Omit<DraftItem, "key">>) {
        setItems((prev) =>
            prev.map((i) =>
                i.key === key
                    ? { ...i, ...patch, origin: "manual" }
                    : i,
            ),
        );
    }

    function removeItem(key: string) {
        setItems((prev) =>
            prev.length <= 1 ? prev : prev.filter((i) => i.key !== key),
        );
    }

    function addItem() {
        setItems((prev) => [...prev, newItem("manual")]);
    }

    // ---------------------------------------------------------------------
    // Inclusion handlers
    // ---------------------------------------------------------------------

    function addInclusion() {
        setInclusions((prev) => [...prev, newInclusion()]);
    }

    function updateInclusion(
        key: string,
        patch: Partial<Omit<Inclusion, "key">>,
    ) {
        setInclusions((prev) =>
            prev.map((i) => (i.key === key ? { ...i, ...patch } : i)),
        );
    }

    function removeInclusion(key: string) {
        setInclusions((prev) => prev.filter((i) => i.key !== key));
    }

    // ---------------------------------------------------------------------
    // Quick-generator
    // ---------------------------------------------------------------------

    function handleGenerate() {
        setError(null);

        if (parsedTotal <= 0) {
            setError("Enter a total amount greater than zero to generate.");
            return;
        }
        if (inclusionsTotal > parsedTotal) {
            setError(
                "Your specific inclusions add up to more than the total. " +
                "Reduce them, or raise the total.",
            );
            return;
        }

        const pool = remainderForGenerics;
        const amounts = splitByWeight(
            pool,
            GENERIC_BUCKETS.map((b) => ({ weight: b.weight })),
        );

        const inclusionRows: DraftItem[] = inclusions
            .filter((inc) => inc.name.trim() !== "" || inc.amount > 0)
            .map((inc) => ({
                key: uid(),
                name: inc.name.trim(),
                amount: round2(Number(inc.amount) || 0),
                description: inc.description?.trim() || "",
                origin: "generated",
            }));

        const genericRows: DraftItem[] = GENERIC_BUCKETS.map((b, i) => ({
            key: uid(),
            name: b.name,
            amount: amounts[i],
            description: b.description,
            origin: "generated",
        }));

        // Preserve manual rows containing user-entered data.
        // Remove the initial empty placeholder so generated items start at Item 1.
        setItems((prev) => [
            ...prev.filter(
                (item) =>
                    item.origin === "manual" &&
                    (
                        item.name.trim() !== "" ||
                        Number(item.amount) !== 0 ||
                        (item.description ?? "").trim() !== ""
                    ),
            ),
            ...inclusionRows,
            ...genericRows,
        ]);

        lastGeneratedSnapshot.current = inputsSignature;
    }

    function handleResetGenerated() {
        // Drop generated rows + generator inputs. Keep manually-added rows.
        setItems((prev) => {
            const manual = prev.filter((i) => i.origin === "manual");
            return manual.length > 0 ? manual : [newItem()];
        });
        setTotal("");
        setInclusions([]);
        lastGeneratedSnapshot.current = null;
        setError(null);
    }

    // ---------------------------------------------------------------------
    // Derived
    // ---------------------------------------------------------------------

    const itemsTotal = useMemo(
        () => round2(items.reduce((s, i) => s + (Number(i.amount) || 0), 0)),
        [items],
    );

    const hasAnyGeneratedRow = items.some((i) => i.origin === "generated");
    const generatorActive =
        hasGenerated || parsedTotal > 0 || inclusions.length > 0;

    // Focus the Generate button the first time it becomes enabled after a
    // change, but only if the user was already interacting with the panel.
    // (Kept minimal — no autofocus fights with the user's typing.)

    // ---------------------------------------------------------------------
    // Submit
    // ---------------------------------------------------------------------

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        if (!courseId) {
            setError("Please select a course.");
            return;
        }
        if (!name.trim()) {
            setError("Name is required.");
            return;
        }
        if (items.length === 0) {
            setError("Add at least one fee item.");
            return;
        }
        for (const [i, item] of items.entries()) {
            if (!item.name.trim()) {
                setError(`Item #${i + 1}: name is required.`);
                return;
            }
            if (!Number.isFinite(item.amount) || item.amount < 0) {
                setError(`Item #${i + 1}: amount must be zero or greater.`);
                return;
            }
        }

        try {
            setSubmitting(true);
            await feeStructureApi.create({
                courseId,
                name: name.trim(),
                currency,
                isActive,
                feeItems: items.map((i) => ({
                    name: i.name.trim(),
                    amount: Number(i.amount),
                    ...(i.description?.trim()
                        ? { description: i.description.trim() }
                        : {}),
                })),
            });
            router.push("/finance/fee-structures");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to create fee structure.",
            );
        } finally {
            setSubmitting(false);
        }
    }

    // ---------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------

    return (
        <div className="mx-auto max-w-full px-4 py-8 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Link
                    href="/finance"
                    className="rounded-sm transition hover:text-[#f59e0b]"
                >
                    Finance
                </Link>
                <span aria-hidden>/</span>
                <Link
                    href="/finance/fee-structures"
                    className="rounded-sm transition hover:text-[#f59e0b]"
                >
                    Fee structures
                </Link>
                <span aria-hidden>/</span>
                <span className="text-slate-700 dark:text-slate-200">New</span>
            </nav>

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-[#1e3a5f] dark:text-slate-100">
                    New fee structure
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Define a course-level fee assessment. The total is computed
                    automatically from the line items.
                </p>
            </div>

            {/* Error banner */}
            {error && (
                <div
                    role="alert"
                    className="mb-6 rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                >
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basics card */}
                <section className="rounded-sm border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <header className="border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
                        <h2 className="text-sm font-semibold text-[#1e3a5f] dark:text-slate-100">
                            Basics
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            Name, course, and status of this fee structure.
                        </p>
                    </header>

                    <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
                        <Field label="Course" required className="sm:col-span-2">
                            <SelectCourse
                                value={courseId}
                                onChange={(id, selected) => {
                                    setCourseId(id);
                                    setCourse(selected);
                                    if (!name.trim() && selected) {
                                        setName(
                                            `${selected.name} — Fee structure`,
                                        );
                                    }
                                }}
                                required
                            />
                        </Field>

                        <Field
                            label="Name"
                            required
                            hint="Human-readable label, e.g. “BSc Nursing — Year 1”."
                            className="sm:col-span-2"
                        >
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="BSc Nursing — Year 1"
                                className={inputClass}
                            />
                        </Field>

                        <Field label="Currency">
                            <select
                                value={currency}
                                onChange={(e) =>
                                    setCurrency(e.target.value as Currency)
                                }
                                className={inputClass}
                            >
                                {CURRENCIES.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Status">
                            <label className="inline-flex h-9 select-none items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) =>
                                        setIsActive(e.target.checked)
                                    }
                                    className="h-4 w-4 rounded-sm border-slate-300 text-[#f59e0b] focus:ring-[#f59e0b] dark:border-slate-700 dark:bg-slate-900"
                                />
                                Active
                            </label>
                        </Field>
                    </div>
                </section>

                {/* Quick generator */}
                <section
                    className={[
                        "rounded-sm border shadow-sm transition-colors",
                        // Both colors present in both themes:
                        //  - light: navy border + orange background tint
                        //  - dark:  navy-tinted background + orange border
                        "border-[#1e3a5f]/25 bg-[#f59e0b]/[0.06]",
                        "dark:border-[#f59e0b]/35 dark:bg-[#1e3a5f]/25",
                    ].join(" ")}
                >
                    <header
                        className={[
                            "flex items-start justify-between gap-3 border-b px-5 py-3.5",
                            "border-[#1e3a5f]/15 dark:border-[#f59e0b]/25",
                        ].join(" ")}
                    >
                        <div>
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1e3a5f] dark:text-slate-100">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4 text-[#f59e0b] dark:text-[#f59e0b]"
                                >
                                    <path d="M5 3v4" />
                                    <path d="M19 17v4" />
                                    <path d="M3 5h4" />
                                    <path d="M17 19h4" />
                                    <path d="m12 5 2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
                                </svg>
                                Quick generate
                                {isStale && (
                                    <span
                                        className={[
                                            "rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                                            "bg-[#f59e0b]/15 text-[#b45309]",
                                            "dark:bg-[#f59e0b]/20 dark:text-[#f59e0b]",
                                        ].join(" ")}
                                    >
                                        Out of date
                                    </span>
                                )}
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                                Enter a total, optionally add specific
                                inclusions, and let the system fill in the rest.
                                Re-running replaces generated rows and keeps
                                your manual ones.
                            </p>
                        </div>
                        {generatorActive && (
                            <button
                                type="button"
                                onClick={handleResetGenerated}
                                className={[
                                    "shrink-0 rounded-sm px-2 py-1 text-xs font-medium transition",
                                    "text-[#1e3a5f] hover:bg-[#1e3a5f]/10",
                                    "dark:text-[#f59e0b] dark:hover:bg-[#f59e0b]/15",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b]",
                                ].join(" ")}
                            >
                                Reset generated
                            </button>
                        )}
                    </header>

                    <div className="space-y-5 p-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field
                                label="Total amount"
                                hint="The full amount the structure should add up to."
                            >
                                <div className="relative">
                                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-medium text-slate-500 dark:text-slate-400">
                                        {currency}
                                    </span>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={total}
                                        onChange={(e) => setTotal(e.target.value)}
                                        placeholder="120000"
                                        className={`${inputClass} pl-12 tabular-nums`}
                                    />
                                </div>
                            </Field>

                            <div
                                className={[
                                    "rounded-sm border px-4 py-3 text-xs",
                                    "border-[#1e3a5f]/20 bg-white",
                                    "dark:border-[#f59e0b]/25 dark:bg-[#0b1424]/40",
                                ].join(" ")}
                            >
                                <Row
                                    label="Total"
                                    value={formatMoney(parsedTotal, currency)}
                                />
                                <Row
                                    label="Inclusions"
                                    value={formatMoney(inclusionsTotal, currency)}
                                />
                                <Row
                                    label="Left for generics"
                                    value={formatMoney(
                                        remainderForGenerics,
                                        currency,
                                    )}
                                    emphasize
                                />
                            </div>
                        </div>

                        {/* Inclusions */}
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs font-medium text-[#1e3a5f] dark:text-slate-200">
                                    Specific inclusions{" "}
                                    <span className="font-normal text-slate-500 dark:text-slate-400">
                                        (optional)
                                    </span>
                                </p>
                                <button
                                    type="button"
                                    onClick={addInclusion}
                                    className={[
                                        "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium shadow-sm transition",
                                        "border-[#1e3a5f]/30 bg-white text-[#1e3a5f] hover:bg-[#1e3a5f]/5",
                                        "dark:border-[#f59e0b]/35 dark:bg-[#0b1424]/60 dark:text-[#f59e0b] dark:hover:bg-[#f59e0b]/10",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b]",
                                    ].join(" ")}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-3 w-3"
                                    >
                                        <path d="M12 5v14" />
                                        <path d="M5 12h14" />
                                    </svg>
                                    Add inclusion
                                </button>
                            </div>

                            {inclusions.length === 0 ? (
                                <p
                                    className={[
                                        "rounded-sm border border-dashed px-3 py-2.5 text-xs text-slate-600",
                                        "border-[#1e3a5f]/25 bg-white/60",
                                        "dark:border-[#f59e0b]/25 dark:bg-[#0b1424]/40 dark:text-slate-300",
                                    ].join(" ")}
                                >
                                    Add course-specific items like{" "}
                                    <em>Attachment</em>, <em>Scrubs</em>, or{" "}
                                    <em>Lab coat</em> — the remaining total is
                                    split across generic fees.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {inclusions.map((inc, i) => (
                                        <div
                                            key={inc.key}
                                            className={[
                                                "grid grid-cols-1 gap-2 rounded-sm border p-2.5 sm:grid-cols-12",
                                                "border-[#1e3a5f]/20 bg-white",
                                                "dark:border-[#f59e0b]/25 dark:bg-[#0b1424]/40",
                                            ].join(" ")}
                                        >
                                            <div className="sm:col-span-5">
                                                <input
                                                    type="text"
                                                    value={inc.name}
                                                    onChange={(e) =>
                                                        updateInclusion(
                                                            inc.key,
                                                            {
                                                                name: e.target
                                                                    .value,
                                                            },
                                                        )
                                                    }
                                                    placeholder="e.g. Attachment"
                                                    className={inputClass}
                                                    aria-label={`Inclusion ${i + 1} name`}
                                                />
                                            </div>
                                            <div className="sm:col-span-4">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    value={inc.amount}
                                                    onChange={(e) =>
                                                        updateInclusion(
                                                            inc.key,
                                                            {
                                                                amount: Number(
                                                                    e.target
                                                                        .value,
                                                                ),
                                                            },
                                                        )
                                                    }
                                                    placeholder="Amount"
                                                    className={`${inputClass} tabular-nums`}
                                                    aria-label={`Inclusion ${i + 1} amount`}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 sm:col-span-3">
                                                <input
                                                    type="text"
                                                    value={
                                                        inc.description ?? ""
                                                    }
                                                    onChange={(e) =>
                                                        updateInclusion(
                                                            inc.key,
                                                            {
                                                                description:
                                                                    e.target
                                                                        .value,
                                                            },
                                                        )
                                                    }
                                                    placeholder="Note (optional)"
                                                    className={inputClass}
                                                    aria-label={`Inclusion ${i + 1} description`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeInclusion(inc.key)
                                                    }
                                                    aria-label={`Remove inclusion ${i + 1}`}
                                                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-slate-200 text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/40"
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        className="h-4 w-4"
                                                    >
                                                        <path d="M18 6 6 18" />
                                                        <path d="m6 6 12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {inclusionsTotal > parsedTotal &&
                                parsedTotal > 0 && (
                                    <p
                                        role="alert"
                                        className="mt-2 text-xs text-rose-600 dark:text-rose-300"
                                    >
                                        Inclusions exceed the total by{" "}
                                        {formatMoney(
                                            inclusionsTotal - parsedTotal,
                                            currency,
                                        )}
                                        .
                                    </p>
                                )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Generic buckets:{" "}
                                {GENERIC_BUCKETS.map((b) => b.name).join(" · ")}
                            </p>
                            <button
                                type="button"
                                onClick={handleGenerate}
                                disabled={!canGenerate}
                                className={[
                                    "inline-flex items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium text-white shadow-sm transition",
                                    // Orange in both themes.
                                    "bg-[#f59e0b] hover:bg-[#d97706]",
                                    // Focus ring is navy in light, orange in dark.
                                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f] focus-visible:ring-offset-2",
                                    "dark:focus-visible:ring-[#f59e0b]",
                                    "disabled:cursor-not-allowed disabled:opacity-60",
                                ].join(" ")}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                >
                                    <path d="M12 3v3" />
                                    <path d="M12 18v3" />
                                    <path d="M3 12h3" />
                                    <path d="M18 12h3" />
                                    <path d="m5.6 5.6 2.1 2.1" />
                                    <path d="m16.3 16.3 2.1 2.1" />
                                    <path d="m5.6 18.4 2.1-2.1" />
                                    <path d="m16.3 7.7 2.1-2.1" />
                                </svg>
                                {hasGenerated && isStale
                                    ? "Re-generate breakdown"
                                    : hasGenerated
                                        ? "Generate again"
                                        : "Generate breakdown"}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Fee items card */}
                <section className="rounded-sm border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
                        <div>
                            <h2 className="text-sm font-semibold text-[#1e3a5f] dark:text-slate-100">
                                Fee items
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Each line contributes to the total.{" "}
                                {hasAnyGeneratedRow && (
                                    <span>
                                        Rows marked{" "}
                                        <span className="mx-0.5 rounded-sm bg-[#f59e0b]/15 px-1 py-px text-[10px] font-medium uppercase tracking-wide text-[#b45309] dark:bg-[#f59e0b]/20 dark:text-[#f59e0b]">
                                            auto
                                        </span>{" "}
                                        are rebuilt when you re-generate.
                                    </span>
                                )}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={addItem}
                            className={[
                                "inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs font-medium shadow-sm transition",
                                "border-slate-200 bg-white text-[#1e3a5f] hover:bg-slate-50",
                                "dark:border-slate-700 dark:bg-slate-900 dark:text-[#93b4dc] dark:hover:bg-slate-800",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b]",
                            ].join(" ")}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3.5 w-3.5"
                            >
                                <path d="M12 5v14" />
                                <path d="M5 12h14" />
                            </svg>
                            Add item
                        </button>
                    </header>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {items.map((item, index) => (
                            <div
                                key={item.key}
                                className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-12"
                            >
                                <div className="sm:col-span-5">
                                    <Field
                                        label={`Item ${index + 1} — name`}
                                        required
                                    >
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={(e) =>
                                                    updateItem(item.key, {
                                                        name: e.target.value,
                                                    })
                                                }
                                                placeholder="Tuition"
                                                className={inputClass}
                                            />
                                            {item.origin === "generated" && (
                                                <span
                                                    className={[
                                                        "pointer-events-none absolute -top-2 right-2 rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                                                        "bg-[#f59e0b]/15 text-[#b45309]",
                                                        "dark:bg-[#f59e0b]/20 dark:text-[#f59e0b]",
                                                    ].join(" ")}
                                                >
                                                    auto
                                                </span>
                                            )}
                                        </div>
                                    </Field>
                                </div>

                                <div className="sm:col-span-3">
                                    <Field label="Amount" required>
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={item.amount}
                                            onChange={(e) =>
                                                updateItem(item.key, {
                                                    amount: Number(
                                                        e.target.value,
                                                    ),
                                                })
                                            }
                                            className={`${inputClass} tabular-nums`}
                                        />
                                    </Field>
                                </div>

                                <div className="sm:col-span-4">
                                    <Field label="Description">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={item.description ?? ""}
                                                onChange={(e) =>
                                                    updateItem(item.key, {
                                                        description:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder="Optional"
                                                className={inputClass}
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeItem(item.key)
                                                }
                                                disabled={items.length <= 1}
                                                aria-label={`Remove item ${index + 1}`}
                                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-slate-200 text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth={2}
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="h-4 w-4"
                                                >
                                                    <path d="M3 6h18" />
                                                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    <path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
                                                    <path d="M10 11v6" />
                                                    <path d="M14 11v6" />
                                                </svg>
                                            </button>
                                        </div>
                                    </Field>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total footer */}
                    <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                        <div>
                            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Total
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Computed from {items.length} item
                                {items.length === 1 ? "" : "s"}.
                                {parsedTotal > 0 &&
                                    Math.abs(itemsTotal - parsedTotal) >
                                    0.005 && (
                                        <span className="ml-1 text-[#b45309] dark:text-[#f59e0b]">
                                            Target was{" "}
                                            {formatMoney(parsedTotal, currency)}.
                                        </span>
                                    )}
                            </p>
                        </div>
                        <p className="text-xl font-semibold tabular-nums text-[#1e3a5f] dark:text-[#f59e0b]">
                            {formatMoney(itemsTotal, currency)}
                        </p>
                    </footer>
                </section>

                {/* Actions */}
                <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <Link
                        href="/finance/fee-structures"
                        className={[
                            "inline-flex items-center justify-center rounded-sm border px-4 py-2 text-sm font-medium shadow-sm transition",
                            "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                            "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b]",
                        ].join(" ")}
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={submitting}
                        className={[
                            "inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-medium text-white shadow-sm transition",
                            // Navy in both themes (structural action).
                            "bg-[#1e3a5f] hover:bg-[#16304f]",
                            // Focus ring alternates to orange for contrast.
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2",
                            "disabled:cursor-not-allowed disabled:opacity-60",
                        ].join(" ")}
                    >
                        {submitting && (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                className="h-4 w-4 animate-spin"
                            >
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="9"
                                    stroke="currentColor"
                                    strokeOpacity="0.25"
                                    strokeWidth="3"
                                />
                                <path
                                    d="M21 12a9 9 0 0 0-9-9"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                />
                            </svg>
                        )}
                        {submitting ? "Creating…" : "Create structure"}
                    </button>
                </div>
            </form>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function formatMoney(value: number, currency: string): string {
    return new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
}

const inputClass =
    "block w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[#f59e0b] focus:outline-none focus:ring-1 focus:ring-[#f59e0b] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

function Field({
    label,
    hint,
    required,
    className,
    children,
}: {
    label: string;
    hint?: string;
    required?: boolean;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={className}>
            <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                {label}
                {required && (
                    <span className="ml-0.5 text-[#f59e0b]">*</span>
                )}
            </label>
            {children}
            {hint && (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {hint}
                </p>
            )}
        </div>
    );
}

function Row({
    label,
    value,
    emphasize,
}: {
    label: string;
    value: string;
    emphasize?: boolean;
}) {
    return (
        <div className="flex items-center justify-between py-0.5">
            <span className="text-slate-500 dark:text-slate-400">
                {label}
            </span>
            <span
                className={[
                    "tabular-nums",
                    emphasize
                        ? "font-semibold text-[#1e3a5f] dark:text-[#f59e0b]"
                        : "text-slate-700 dark:text-slate-200",
                ].join(" ")}
            >
                {value}
            </span>
        </div>
    );
}