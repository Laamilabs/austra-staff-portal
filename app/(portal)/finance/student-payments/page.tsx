// app/(portal)/finance/student-payments/page.tsx

"use client";

import Link from "next/link";
import {
    useCallback,
    useDeferredValue,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Download, Plus } from "lucide-react";

import {
    studentFeeApi,
    type StudentFee,
} from "@/app/types/student-fee";

import type {
    FilterState,
    Group,
    PayFilter,
    Row,
    SortKey,
    StatusFilter,
} from "./types";

import {
    EmptyResults,
    ErrorBanner,
    FirstLoadSkeleton,
    GroupCard,
    KpiStrip,
    ResultsHeader,
    Toolbar,
    type FilterChip,
} from "./components";
import {
    PAGE,
    BTN,
    CARD,
    FOCUS,
    PAY_TABS,
    buildGroups,
    exportCsv as exportCsvHelper,
    matchesRow,
    money,
    pct,
    toRow,
} from "./helpers";

export default function StudentPaymentsPage() {
    const [fees, setFees] = useState<StudentFee[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const [elapsed, setElapsed] = useState(0);

    const [search, setSearch] = useState("");
    const [pay, setPay] = useState<PayFilter>("all");
    const [status, setStatus] = useState<StatusFilter>("live");
    const [course, setCourse] = useState("all");
    const [structure, setStructure] = useState("all");
    const [minOut, setMinOut] = useState(0);
    const [minBalance, setMinBalance] = useState("");
    const [sort, setSort] = useState<SortKey>("balance");
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [limitState, setLimitState] = useState({ sig: "", n: PAGE });

    const searchRef = useRef<HTMLInputElement>(null);

    /* ---------------- Data loading ---------------- */

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await studentFeeApi.getAll();
            setFees(data);
            setUpdatedAt(new Date());
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

    /* ---------------- Elapsed loader timer ---------------- */

    useEffect(() => {
        if (!loading) {
            setElapsed(0);
            return;
        }
        const started = Date.now();
        const id = setInterval(
            () => setElapsed(Math.floor((Date.now() - started) / 1000)),
            1000,
        );
        return () => clearInterval(id);
    }, [loading]);

    /* ---------------- "/" focuses search ---------------- */

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (
                e.key !== "/" ||
                t?.closest("input, textarea, select")
            )
                return;
            e.preventDefault();
            searchRef.current?.focus();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    /* ---------------- Filtering pipeline ---------------- */

    const q = useDeferredValue(search).trim().toLowerCase();
    const minBal = Number(minBalance) || 0;

    const rows = useMemo(() => (fees ?? []).map(toRow), [fees]);

    const filters = useMemo<FilterState>(
        () => ({
            status,
            pay,
            course,
            structure,
            minOut,
            minBal,
            q,
        }),
        [status, pay, course, structure, minOut, minBal, q],
    );

    const filtered = useMemo(
        () => rows.filter((r) => matchesRow(r, filters)),
        [rows, filters],
    );

    const payCounts = useMemo(() => {
        const c: Record<PayFilter, number> = {
            all: 0,
            unpaid: 0,
            partial: 0,
            paid: 0,
        };
        for (const r of rows) {
            if (!matchesRow(r, filters, true)) continue;
            c.all++;
            c[r.state]++;
        }
        return c;
    }, [rows, filters]);

    const courseOptions = useMemo(() => {
        const m = new Map<string, string>();
        for (const r of rows)
            if (r.courseId)
                m.set(
                    r.courseId,
                    r.code ? `${r.code} · ${r.course}` : r.course,
                );
        return Array.from(m.entries()).sort((a, b) =>
            a[1].localeCompare(b[1]),
        );
    }, [rows]);

    const structureOptions = useMemo(() => {
        const m = new Map<string, string>();
        for (const r of rows)
            if (
                r.structureId &&
                (course === "all" || r.courseId === course)
            )
                m.set(r.structureId, r.structure);
        return Array.from(m.entries()).sort((a, b) =>
            a[1].localeCompare(b[1]),
        );
    }, [rows, course]);

    /* ---------------- Currency selection ---------------- */

    const { primary, otherCurrency } = useMemo(() => {
        const counts = new Map<string, number>();
        for (const r of filtered)
            if (r.risk !== "cancelled")
                counts.set(r.currency, (counts.get(r.currency) ?? 0) + 1);
        const top = Array.from(counts.entries()).sort(
            (a, b) => b[1] - a[1],
        )[0];
        const p = top?.[0] ?? "KES";
        let other = 0;
        for (const [cur, n] of counts) if (cur !== p) other += n;
        return { primary: p, otherCurrency: other };
    }, [filtered]);

    /* ---------------- Totals + grouping ---------------- */

    const totals = useMemo(() => {
        let total = 0;
        let paid = 0;
        let balance = 0;
        let high = 0;
        for (const r of filtered) {
            if (r.risk === "high") high++;
            if (r.risk === "cancelled" || r.currency !== primary) continue;
            total += r.total;
            paid += r.paid;
            balance += r.balance;
        }
        return {
            total,
            paid,
            balance,
            high,
            rate: pct(paid, total),
        };
    }, [filtered, primary]);

    const groups = useMemo(
        () => buildGroups(filtered, primary, sort),
        [filtered, primary, sort],
    );

    /* ---------------- Pagination ---------------- */

    const sig = [
        q,
        pay,
        status,
        course,
        structure,
        minOut,
        minBal,
        sort,
    ].join("|");
    const limit = limitState.sig === sig ? limitState.n : PAGE;
    const shown: Group[] = groups.slice(0, limit);

    /* ---------------- Active filter chips ---------------- */

    const chips: FilterChip[] = [];
    if (search.trim())
        chips.push({
            key: "q",
            label: `“${search.trim()}”`,
            clear: () => setSearch(""),
        });
    if (pay !== "all")
        chips.push({
            key: "pay",
            label: PAY_TABS.find((t) => t.key === pay)!.label,
            clear: () => setPay("all"),
        });
    if (course !== "all")
        chips.push({
            key: "course",
            label:
                courseOptions.find(([id]) => id === course)?.[1] ??
                "Course",
            clear: () => {
                setCourse("all");
                setStructure("all");
            },
        });
    if (structure !== "all")
        chips.push({
            key: "structure",
            label:
                structureOptions.find(([id]) => id === structure)?.[1] ??
                "Structure",
            clear: () => setStructure("all"),
        });
    if (status !== "live")
        chips.push({
            key: "status",
            label:
                status === "all"
                    ? "Including cancelled"
                    : status.charAt(0) +
                    status.slice(1).toLowerCase(),
            clear: () => setStatus("live"),
        });
    if (minOut)
        chips.push({
            key: "out",
            label: `≥ ${minOut}% outstanding`,
            clear: () => setMinOut(0),
        });
    if (minBal)
        chips.push({
            key: "bal",
            label: `Balance ≥ ${money(minBal, primary)}`,
            clear: () => setMinBalance(""),
        });

    const clearAll = () => {
        setSearch("");
        setPay("all");
        setStatus("live");
        setCourse("all");
        setStructure("all");
        setMinOut(0);
        setMinBalance("");
    };

    /* ---------------- Handlers ---------------- */

    const handleCourseChange = (value: string) => {
        setCourse(value);
        setStructure("all");
    };

    const toggle = (id: string) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const allExpanded =
        shown.length > 0 &&
        shown.every((g) => expanded.has(g.studentId));

    const handleToggleAll = () =>
        setExpanded(
            allExpanded
                ? new Set()
                : new Set(shown.map((g) => g.studentId)),
        );

    const handleExportCsv = () => exportCsvHelper(filtered);

    const firstLoad = fees === null && loading;
    const activeCount = filtered.filter(
        (r) => r.risk !== "cancelled",
    ).length;

    /* ---------------- Render ---------------- */

    return (
        <main className="mx-auto w-full min-w-0 max-w-full py-6 sm:px-6 sm:py-8 lg:px-8">
            <style>{`@keyframes feeSlide{0%{transform:translateX(-100%)}100%{transform:translateX(450%)}}`}</style>

            {loading && fees !== null && (
                <div
                    role="progressbar"
                    aria-label="Refreshing fee records"
                    className="relative -mt-8 mb-8 h-0.5 overflow-hidden bg-orange-400/20"
                >
                    <div className="absolute inset-y-0 left-0 w-1/5 bg-orange-500 motion-safe:animate-[feeSlide_1.3s_ease-in-out_infinite]" />
                </div>
            )}

            <nav className="mb-3 flex gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <Link href="/finance" className="hover:text-orange-500">
                    Finance
                </Link>
                <span aria-hidden>/</span>
                <span>Student payments</span>
            </nav>

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <h1 className="text-3xl font-semibold text-[#0B1E3D] dark:text-white">
                        Student fees
                    </h1>
                    <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                        Browse fee assignments and open any record for
                        full details.
                    </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <button
                        type="button"
                        onClick={handleExportCsv}
                        disabled={filtered.length === 0}
                        className={`${BTN} ${FOCUS}`}
                    >
                        <Download size={16} /> Export CSV
                    </button>
                    <Link
                        href="/finance/student-payments/new"
                        className={`inline-flex items-center justify-center gap-2 rounded-sm bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-950/20 transition-colors hover:bg-orange-400 active:bg-orange-600 ${FOCUS}`}
                    >
                        <Plus size={16} aria-hidden /> Assign fee
                        structure
                    </Link>
                </div>
            </div>

            {error && (
                <ErrorBanner
                    error={error}
                    hasData={fees !== null}
                    loading={loading}
                    onRetry={() => void loadData()}
                />
            )}

            {firstLoad && <FirstLoadSkeleton elapsed={elapsed} />}

            {fees !== null && (
                <>
                    <KpiStrip
                        totals={totals}
                        activeCount={activeCount}
                        groupsCount={groups.length}
                        primary={primary}
                        minOut={minOut}
                        onToggleMinOut={() =>
                            setMinOut(minOut === 75 ? 0 : 75)
                        }
                    />

                    {otherCurrency > 0 && (
                        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                            {otherCurrency} assignment
                            {otherCurrency === 1 ? " is" : "s are"} not
                            in {primary} and left out of the totals
                            above.
                        </p>
                    )}

                    <Toolbar
                        search={search}
                        onSearchChange={setSearch}
                        searchRef={searchRef}
                        onRefresh={() => void loadData()}
                        loading={loading}
                        course={course}
                        onCourseChange={handleCourseChange}
                        courseOptions={courseOptions}
                        structure={structure}
                        onStructureChange={setStructure}
                        structureOptions={structureOptions}
                        status={status}
                        onStatusChange={setStatus}
                        sort={sort}
                        onSortChange={setSort}
                        pay={pay}
                        onPayChange={setPay}
                        payCounts={payCounts}
                        minOut={minOut}
                        onMinOutChange={setMinOut}
                        minBalance={minBalance}
                        onMinBalanceChange={setMinBalance}
                        primary={primary}
                    />

                    <ResultsHeader
                        filteredCount={filtered.length}
                        rowsCount={rows.length}
                        groupsCount={groups.length}
                        updatedAt={updatedAt}
                        chips={chips}
                        onClearAll={clearAll}
                        canToggleAll={shown.length > 1}
                        allExpanded={allExpanded}
                        onToggleAll={handleToggleAll}
                    />

                    {groups.length === 0 ? (
                        <EmptyResults
                            hasRows={rows.length > 0}
                            onClear={clearAll}
                        />
                    ) : (
                        <div
                            className={`mt-4 space-y-3 transition-opacity ${loading ? "opacity-70" : ""}`}
                        >
                            {shown.map((g) => (
                                <GroupCard
                                    key={g.studentId}
                                    group={g}
                                    open={expanded.has(g.studentId)}
                                    onToggle={() => toggle(g.studentId)}
                                    primary={primary}
                                />
                            ))}

                            {groups.length > shown.length && (
                                <div className="flex justify-center pt-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setLimitState({
                                                sig,
                                                n: limit + PAGE,
                                            })
                                        }
                                        className={`${BTN} ${FOCUS}`}
                                    >
                                        Show{" "}
                                        {Math.min(
                                            PAGE,
                                            groups.length - shown.length,
                                        )}{" "}
                                        more students
                                        <span className="text-xs text-zinc-400">
                                            (
                                            {groups.length - shown.length}{" "}
                                            remaining)
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </main>
    );
}