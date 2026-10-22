"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Receipt,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Clock,
    XCircle,
    Undo2,
    UserRound,
    BookOpen,
    Hash,
    CalendarClock,
    Wallet,
    FileText,
    Save,
    Building2,
    Mail,
    Phone,
    IdCard,
    BadgeCheck,
} from "lucide-react";

import {
    FeeTransaction,
    PaymentMethod,
    TransactionStatus,
    feeTransactionApi,
} from "@/app/types/fee-transaction";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FOCUS_RING =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

const CODE_CHIP =
    "shrink-0 rounded-sm bg-[#0B1E3D]/5 px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#0B1E3D] ring-1 ring-inset ring-[#0B1E3D]/10 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/25";

const STATUS_LABEL: Record<TransactionStatus, string> = {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    REVERSED: "Reversed",
};

const STATUS_STYLE: Record<TransactionStatus, string> = {
    PENDING:
        "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/25",
    CONFIRMED:
        "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25",
    REVERSED:
        "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/25",
};

const STATUS_ICON: Record<TransactionStatus, typeof Clock> = {
    PENDING: Clock,
    CONFIRMED: CheckCircle2,
    REVERSED: XCircle,
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
    CASH: "Cash",
    MPESA: "M-Pesa",
    BANK_TRANSFER: "Bank Transfer",
    OTHER: "Other",
};

const METHOD_STYLE: Record<PaymentMethod, string> = {
    CASH:
        "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25",
    MPESA:
        "bg-green-50 text-green-700 ring-green-200 dark:bg-green-400/10 dark:text-green-300 dark:ring-green-400/25",
    BANK_TRANSFER:
        "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/25",
    OTHER:
        "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:ring-white/20",
};

// ---------------------------------------------------------------------------
// Populated-field helpers
// ---------------------------------------------------------------------------

function refId(ref: unknown): string | undefined {
    if (!ref) return undefined;
    if (typeof ref === "string") return ref;
    if (typeof ref === "object" && "_id" in (ref as object)) {
        return (ref as { _id: string })._id;
    }
    return undefined;
}

function getStudentName(tx: FeeTransaction): string {
    const ref = tx.studentId;
    if (!ref || typeof ref === "string") return "";
    const n = ref.fullName;
    if (!n) return "";
    return [n.firstName, n.middleName, n.lastName]
        .filter((p) => p?.trim())
        .join(" ");
}

function getStudentEmail(tx: FeeTransaction): string {
    const ref = tx.studentId;
    if (!ref || typeof ref === "string") return "";
    return ref.contact?.email ?? "";
}

function getStudentPhone(tx: FeeTransaction): string {
    const ref = tx.studentId;
    if (!ref || typeof ref === "string") return "";
    return ref.contact?.phoneNumber ?? "";
}

function getStudentIdNumber(tx: FeeTransaction): string {
    const ref = tx.studentId;
    if (!ref || typeof ref === "string") return "";
    return ref.identification?.idNumber ?? "";
}

function getAdmissionNumber(tx: FeeTransaction): string {
    const studentRef = tx.studentId;
    if (!studentRef || typeof studentRef === "string") return "";

    const courses = studentRef.courses ?? [];
    if (courses.length === 0) return "";

    const txCourseId = refId(tx.courseId);

    if (txCourseId) {
        const match = courses.find(
            (enrollment) => refId(enrollment.courseId) === txCourseId,
        );
        if (match?.admissionNumber) return match.admissionNumber;
    }

    return courses[0]?.admissionNumber ?? "";
}

function getCourseName(tx: FeeTransaction): string {
    const ref = tx.courseId;
    if (!ref || typeof ref === "string") return "";
    return ref.name ?? "";
}

function getCourseCode(tx: FeeTransaction): string {
    const ref = tx.courseId;
    if (!ref || typeof ref === "string") return "";
    return ref.courseCode ?? "";
}

function getCourseLevel(tx: FeeTransaction): string {
    const ref = tx.courseId;
    if (!ref || typeof ref === "string") return "";
    return ref.level ?? "";
}

function getCourseDuration(tx: FeeTransaction): string {
    const ref = tx.courseId;
    if (!ref || typeof ref === "string") return "";
    return ref.duration ?? "";
}

function getConfirmedByName(tx: FeeTransaction): string {
    const ref = tx.confirmedBy;
    if (!ref || typeof ref === "string") return "";
    return ref.name ?? ref.email ?? "";
}

function getConfirmedByEmail(tx: FeeTransaction): string {
    const ref = tx.confirmedBy;
    if (!ref || typeof ref === "string") return "";
    return ref.email ?? "";
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatMoney(amount: number, currency = "KES"): string {
    const code = currency?.toUpperCase() || "KES";
    try {
        return new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency: code,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${code} ${amount.toFixed(2)}`;
    }
}

function isDateOnly(iso?: string): boolean {
    if (!iso) return false;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    return (
        d.getUTCHours() === 0 &&
        d.getUTCMinutes() === 0 &&
        d.getUTCSeconds() === 0 &&
        d.getUTCMilliseconds() === 0
    );
}

function formatDate(iso?: string): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-KE", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
}

function formatTime(iso?: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-KE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function formatDateTime(iso?: string): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";

    const datePart = formatDate(iso);

    if (isDateOnly(iso)) {
        return `${datePart} (date only)`;
    }

    return `${datePart} · ${formatTime(iso)}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TransactionDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const id = params?.id ?? "";

    const [tx, setTx] = useState<FeeTransaction | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Notes editor
    const [notes, setNotes] = useState("");
    const [notesDirty, setNotesDirty] = useState(false);
    const [savingNotes, setSavingNotes] = useState(false);
    const [notesError, setNotesError] = useState<string | null>(null);
    const [notesSaved, setNotesSaved] = useState(false);

    // Reverse flow
    const [showReverseConfirm, setShowReverseConfirm] = useState(false);
    const [reversing, setReversing] = useState(false);
    const [reverseError, setReverseError] = useState<string | null>(null);

    // -----------------------------------------------------------------------
    // Load
    // -----------------------------------------------------------------------

    const load = useCallback(async () => {
        if (!id) {
            setError("Missing transaction ID.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await feeTransactionApi.getById(id);
            setTx(data);
            setNotes(data.notes ?? "");
            setNotesDirty(false);
        } catch (err) {
            console.error("Failed to load transaction:", err);
            setError(
                "Could not load this transaction. It may have been deleted or the ID is invalid.",
            );
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    // -----------------------------------------------------------------------
    // Save notes
    // -----------------------------------------------------------------------

    const handleSaveNotes = async () => {
        if (!tx) return;

        setNotesError(null);
        setNotesSaved(false);
        setSavingNotes(true);

        try {
            const updated = await feeTransactionApi.update(tx._id, {
                notes: notes.trim() || undefined,
            });
            setTx(updated);
            setNotes(updated.notes ?? "");
            setNotesDirty(false);
            setNotesSaved(true);
            window.setTimeout(() => setNotesSaved(false), 2000);
        } catch (err) {
            console.error("Failed to save notes:", err);
            setNotesError("Could not save notes. Please try again.");
        } finally {
            setSavingNotes(false);
        }
    };

    // -----------------------------------------------------------------------
    // Reverse
    // -----------------------------------------------------------------------

    const handleReverse = async () => {
        if (!tx) return;

        setReverseError(null);
        setReversing(true);

        try {
            await feeTransactionApi.reverse(tx._id);
            setShowReverseConfirm(false);
            await load();
        } catch (err) {
            console.error("Failed to reverse transaction:", err);
            setReverseError(
                "Could not reverse this transaction. It may have already been reversed.",
            );
        } finally {
            setReversing(false);
        }
    };

    // -----------------------------------------------------------------------
    // Derived
    // -----------------------------------------------------------------------

    const derived = useMemo(() => {
        if (!tx) {
            return {
                studentName: "",
                studentEmail: "",
                studentPhone: "",
                studentIdNumber: "",
                admissionNumber: "",
                courseName: "",
                courseCode: "",
                courseLevel: "",
                courseDuration: "",
                confirmedByName: "",
                confirmedByEmail: "",
                dateOnly: false,
            };
        }

        return {
            studentName: getStudentName(tx),
            studentEmail: getStudentEmail(tx),
            studentPhone: getStudentPhone(tx),
            studentIdNumber: getStudentIdNumber(tx),
            admissionNumber: getAdmissionNumber(tx),
            courseName: getCourseName(tx),
            courseCode: getCourseCode(tx),
            courseLevel: getCourseLevel(tx),
            courseDuration: getCourseDuration(tx),
            confirmedByName: getConfirmedByName(tx),
            confirmedByEmail: getConfirmedByEmail(tx),
            dateOnly: isDateOnly(tx.transactionDate),
        };
    }, [tx]);

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    if (loading) {
        return (
            <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-zinc-200 bg-white py-24 dark:border-white/10 dark:bg-[#0B1E3D]">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500 dark:text-orange-400" />
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        Loading transaction...
                    </span>
                </div>
            </div>
        );
    }

    if (error || !tx) {
        return (
            <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
                <Link
                    href="/finance/transactions"
                    className={`mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-[#0B1E3D] dark:text-zinc-400 dark:hover:text-white ${FOCUS_RING}`}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to transactions
                </Link>

                <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-zinc-200 bg-white py-20 text-center dark:border-white/10 dark:bg-[#0B1E3D]">
                    <AlertCircle className="h-8 w-8 text-rose-500" />
                    <p className="text-sm font-medium text-[#0B1E3D] dark:text-white">
                        {error ?? "Transaction not found"}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={load}
                            className={`inline-flex h-9 items-center gap-2 rounded-sm border border-zinc-200 px-3 text-sm font-medium text-[#0B1E3D] hover:bg-zinc-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5 ${FOCUS_RING}`}
                        >
                            Try again
                        </button>
                        <Link
                            href="/finance/transactions"
                            className={`inline-flex h-9 items-center gap-2 rounded-sm bg-orange-500 px-3 text-sm font-medium text-white hover:bg-orange-600 ${FOCUS_RING}`}
                        >
                            Back to list
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const StatusIcon = STATUS_ICON[tx.status];
    const isConfirmed = tx.status === "CONFIRMED";

    return (
        <div className="mx-auto w-full max-w-full py-6 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/finance/transactions"
                    className={`mb-3 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-[#0B1E3D] dark:text-zinc-400 dark:hover:text-white ${FOCUS_RING}`}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to transactions
                </Link>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-orange-400/15 text-orange-500 dark:bg-orange-400/10 dark:text-orange-300">
                            <Receipt className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                            <h1 className="text-lg font-semibold text-[#0B1E3D] dark:text-white">
                                Transaction details
                            </h1>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${STATUS_STYLE[tx.status]}`}
                                >
                                    <StatusIcon className="h-3 w-3" />
                                    {STATUS_LABEL[tx.status]}
                                </span>
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${METHOD_STYLE[tx.paymentMethod]}`}
                                >
                                    {METHOD_LABEL[tx.paymentMethod]}
                                </span>
                                <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                                    ID: {tx._id.slice(-8)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {isConfirmed && (
                        <button
                            type="button"
                            onClick={() => setShowReverseConfirm(true)}
                            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-sm border border-zinc-200 px-3 text-sm font-medium text-zinc-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-white/10 dark:text-zinc-300 dark:hover:border-rose-400/30 dark:hover:bg-rose-400/10 dark:hover:text-rose-300 ${FOCUS_RING}`}
                        >
                            <Undo2 className="h-4 w-4" />
                            Reverse payment
                        </button>
                    )}
                </div>
            </div>

            {/* Amount hero */}
            <div className="mb-6 rounded-sm border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-[#0B1E3D]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Amount
                        </p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums text-[#0B1E3D] dark:text-white">
                            {formatMoney(tx.amount, tx.currency)}
                        </p>
                    </div>

                    <div className="text-right">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            {derived.dateOnly
                                ? "Transaction date"
                                : "Transaction date & time"}
                        </p>
                        <p className="mt-1 text-sm font-medium tabular-nums text-[#0B1E3D] dark:text-white">
                            {derived.dateOnly
                                ? formatDate(tx.transactionDate)
                                : formatDateTime(tx.transactionDate)}
                        </p>
                        {derived.dateOnly && (
                            <p className="mt-0.5 text-[11px] italic text-zinc-400 dark:text-zinc-500">
                                No time was recorded for this entry.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Detail grid */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Student */}
                <Section
                    title="Student"
                    icon={<UserRound className="h-4 w-4" />}
                >
                    {derived.studentName ? (
                        <dl className="space-y-2.5">
                            <Field
                                label="Full name"
                                value={derived.studentName}
                            />
                            {derived.admissionNumber && (
                                <Field
                                    label="Admission No."
                                    value={
                                        <span className={CODE_CHIP}>
                                            {derived.admissionNumber}
                                        </span>
                                    }
                                />
                            )}
                            {derived.studentEmail && (
                                <Field
                                    label="Email"
                                    icon={
                                        <Mail className="h-3.5 w-3.5" />
                                    }
                                    value={derived.studentEmail}
                                />
                            )}
                            {derived.studentPhone && (
                                <Field
                                    label="Phone"
                                    icon={
                                        <Phone className="h-3.5 w-3.5" />
                                    }
                                    value={derived.studentPhone}
                                />
                            )}
                            {derived.studentIdNumber && (
                                <Field
                                    label="ID number"
                                    icon={
                                        <IdCard className="h-3.5 w-3.5" />
                                    }
                                    value={derived.studentIdNumber}
                                />
                            )}
                        </dl>
                    ) : (
                        <FallbackRef
                            id={refId(tx.studentId) ?? ""}
                            message="Student details are not available — the referenced record may have been deleted."
                        />
                    )}
                </Section>

                {/* Course */}
                <Section
                    title="Course"
                    icon={<BookOpen className="h-4 w-4" />}
                >
                    {derived.courseName || derived.courseCode ? (
                        <dl className="space-y-2.5">
                            {derived.courseName && (
                                <Field
                                    label="Name"
                                    value={derived.courseName}
                                />
                            )}
                            {derived.courseCode && (
                                <Field
                                    label="Code"
                                    value={
                                        <span className={CODE_CHIP}>
                                            {derived.courseCode}
                                        </span>
                                    }
                                />
                            )}
                            {derived.courseLevel && (
                                <Field
                                    label="Level"
                                    value={derived.courseLevel}
                                />
                            )}
                            {derived.courseDuration && (
                                <Field
                                    label="Duration"
                                    value={derived.courseDuration}
                                />
                            )}
                        </dl>
                    ) : (
                        <FallbackRef
                            id={refId(tx.courseId) ?? ""}
                            message="Course details are not available — the referenced record may have been deleted."
                        />
                    )}
                </Section>

                {/* Payment */}
                <Section
                    title="Payment"
                    icon={<Wallet className="h-4 w-4" />}
                >
                    <dl className="space-y-2.5">
                        <Field
                            label="Method"
                            value={METHOD_LABEL[tx.paymentMethod]}
                        />
                        <Field
                            label="Currency"
                            value={tx.currency?.toUpperCase() ?? "KES"}
                        />
                        <Field
                            label="Date & time"
                            icon={<CalendarClock className="h-3.5 w-3.5" />}
                            value={
                                derived.dateOnly
                                    ? `${formatDate(tx.transactionDate)} (date only)`
                                    : formatDateTime(tx.transactionDate)
                            }
                        />
                        {tx.confirmationCode && (
                            <Field
                                label="Confirmation code"
                                icon={<Hash className="h-3.5 w-3.5" />}
                                value={
                                    <span className={CODE_CHIP}>
                                        {tx.confirmationCode}
                                    </span>
                                }
                            />
                        )}
                    </dl>
                </Section>

                {/* Audit */}
                <Section
                    title="Audit"
                    icon={<BadgeCheck className="h-4 w-4" />}
                >
                    <dl className="space-y-2.5">
                        <Field
                            label="Confirmed by"
                            icon={<UserRound className="h-3.5 w-3.5" />}
                            value={
                                derived.confirmedByName ||
                                (refId(tx.confirmedBy)
                                    ? refId(tx.confirmedBy)!.slice(-8)
                                    : "—")
                            }
                        />
                        {derived.confirmedByEmail &&
                            derived.confirmedByEmail !==
                            derived.confirmedByName && (
                                <Field
                                    label="Email"
                                    icon={<Mail className="h-3.5 w-3.5" />}
                                    value={derived.confirmedByEmail}
                                />
                            )}
                        {tx.createdAt && (
                            <Field
                                label="Recorded at"
                                icon={
                                    <CalendarClock className="h-3.5 w-3.5" />
                                }
                                value={formatDateTime(tx.createdAt)}
                            />
                        )}
                        {tx.updatedAt &&
                            tx.createdAt &&
                            tx.updatedAt !== tx.createdAt && (
                                <Field
                                    label="Last updated"
                                    icon={
                                        <CalendarClock className="h-3.5 w-3.5" />
                                    }
                                    value={formatDateTime(tx.updatedAt)}
                                />
                            )}
                    </dl>
                </Section>
            </div>

            {/* Notes editor */}
            <div className="mt-4 rounded-sm border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-[#0B1E3D]">
                <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-[#0B1E3D]/5 text-[#0B1E3D] dark:bg-white/10 dark:text-orange-300">
                        <FileText className="h-3.5 w-3.5" />
                    </span>
                    <h2 className="text-sm font-semibold text-[#0B1E3D] dark:text-white">
                        Notes
                    </h2>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        (only field that can be edited)
                    </span>
                </div>

                {notesError && (
                    <div className="mb-3 flex items-start gap-2 rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{notesError}</span>
                    </div>
                )}

                <textarea
                    value={notes}
                    onChange={(e) => {
                        setNotes(e.target.value);
                        setNotesDirty(true);
                        setNotesSaved(false);
                    }}
                    maxLength={500}
                    rows={4}
                    placeholder="Add any context for this payment..."
                    className="w-full resize-none rounded-sm border border-zinc-200 bg-white p-3 text-sm text-[#0B1E3D] outline-none transition-colors placeholder:text-zinc-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25 dark:border-white/10 dark:bg-[#0B1E3D] dark:text-white dark:placeholder:text-zinc-500"
                />

                <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        {notes.length}/500
                    </p>

                    <div className="flex items-center gap-2">
                        {notesSaved && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Saved
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={handleSaveNotes}
                            disabled={!notesDirty || savingNotes}
                            className={`inline-flex h-9 items-center gap-2 rounded-sm bg-orange-500 px-3 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                        >
                            {savingNotes ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Save notes
                        </button>
                    </div>
                </div>
            </div>

            {/* Reverse confirm modal */}
            {showReverseConfirm && (
                <ReverseModal
                    transaction={tx}
                    studentName={derived.studentName}
                    admissionNumber={derived.admissionNumber}
                    courseName={derived.courseName}
                    busy={reversing}
                    error={reverseError}
                    onCancel={() => {
                        if (reversing) return;
                        setShowReverseConfirm(false);
                        setReverseError(null);
                    }}
                    onConfirm={handleReverse}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

function Section({ title, icon, children }: SectionProps) {
    return (
        <div className="rounded-sm border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-[#0B1E3D]">
            <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-[#0B1E3D]/5 text-[#0B1E3D] dark:bg-white/10 dark:text-orange-300">
                    {icon}
                </span>
                <h2 className="text-sm font-semibold text-[#0B1E3D] dark:text-white">
                    {title}
                </h2>
            </div>
            {children}
        </div>
    );
}

interface FieldProps {
    label: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
}

function Field({ label, value, icon }: FieldProps) {
    return (
        <div className="flex items-start justify-between gap-3">
            <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                {icon && (
                    <span className="text-zinc-400 dark:text-zinc-500">
                        {icon}
                    </span>
                )}
                {label}
            </span>
            <span className="max-w-[60%] truncate text-right text-sm font-medium text-[#0B1E3D] dark:text-white">
                {value}
            </span>
        </div>
    );
}

function FallbackRef({ id, message }: { id: string; message: string }) {
    return (
        <div className="space-y-2">
            {id && (
                <span className={CODE_CHIP}>ref: {id.slice(-8)}</span>
            )}
            <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{message}</span>
            </p>
        </div>
    );
}

interface ReverseModalProps {
    transaction: FeeTransaction;
    studentName: string;
    admissionNumber: string;
    courseName: string;
    busy: boolean;
    error: string | null;
    onCancel: () => void;
    onConfirm: () => void;
}

function ReverseModal({
    transaction,
    studentName,
    admissionNumber,
    courseName,
    busy,
    error,
    onCancel,
    onConfirm,
}: ReverseModalProps) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reverse-modal-title"
            onClick={(e) => {
                if (e.target === e.currentTarget && !busy) onCancel();
            }}
        >
            <div className="w-full max-w-md rounded-sm border border-zinc-200 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#0B1E3D]">
                <div className="mb-3 flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/25">
                        <Undo2 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                        <h2
                            id="reverse-modal-title"
                            className="text-base font-semibold text-[#0B1E3D] dark:text-white"
                        >
                            Reverse this payment?
                        </h2>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            The linked fee assessment&rsquo;s paid balance
                            will be reduced by this amount, and its status
                            will be reset to active (unless cancelled).
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-3 flex items-start gap-2 rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="mb-4 space-y-1.5 rounded-sm border border-zinc-100 bg-zinc-50 p-3 text-sm dark:border-white/5 dark:bg-white/[0.03]">
                    {studentName && (
                        <Row label="Student" value={studentName} />
                    )}
                    {admissionNumber && (
                        <Row
                            label="Admission No."
                            value={admissionNumber}
                        />
                    )}
                    {courseName && (
                        <Row label="Course" value={courseName} />
                    )}
                    <Row
                        label="Amount"
                        value={formatMoney(
                            transaction.amount,
                            transaction.currency,
                        )}
                    />
                    <Row
                        label="Method"
                        value={METHOD_LABEL[transaction.paymentMethod]}
                    />
                    <Row
                        label="Date"
                        value={formatDateTime(transaction.transactionDate)}
                    />
                    {transaction.confirmationCode && (
                        <Row
                            label="Reference"
                            value={transaction.confirmationCode}
                        />
                    )}
                </div>

                <div className="flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className={`inline-flex h-9 items-center rounded-sm border border-zinc-200 px-3 text-sm font-medium text-[#0B1E3D] hover:bg-zinc-50 disabled:opacity-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5 ${FOCUS_RING}`}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className={`inline-flex h-9 items-center gap-2 rounded-sm bg-rose-600 px-3 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60 ${FOCUS_RING}`}
                    >
                        {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Undo2 className="h-4 w-4" />
                        )}
                        Reverse payment
                    </button>
                </div>
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {label}
            </span>
            <span className="truncate text-sm font-medium text-[#0B1E3D] dark:text-white">
                {value}
            </span>
        </div>
    );
}