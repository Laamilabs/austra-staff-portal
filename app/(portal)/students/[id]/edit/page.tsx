"use client";

import {
    ArrowLeft,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Save,
    User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import {
    studentApi,
    type Student,
} from "@/app/types/students";

type EditMode = "contact" | "personal";

function toDateInputValue(value?: string | null) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toISOString().slice(0, 10);
}

export default function EditStudentPage() {
    const params = useParams();
    const router = useRouter();

    const studentId = String(params.id);

    const [student, setStudent] = useState<Student | null>(null);
    const [mode, setMode] = useState<EditMode>("contact");

    // Editable fields — only a safe subset of the student record.
    const [firstName, setFirstName] = useState("");
    const [middleName, setMiddleName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [nationality, setNationality] = useState("");
    const [occupation, setOccupation] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadStudent() {
            try {
                setLoading(true);
                setError("");

                const response = await studentApi.getById(studentId);
                const fetched = response.data;

                if (cancelled) return;

                setStudent(fetched);

                setFirstName(fetched.fullName?.firstName || "");
                setMiddleName(fetched.fullName?.middleName || "");
                setLastName(fetched.fullName?.lastName || "");

                setEmail(fetched.contact?.email || "");
                setPhoneNumber(fetched.contact?.phoneNumber || "");

                setDateOfBirth(toDateInputValue(fetched.dateOfBirth));
                setNationality(fetched.nationality || "");
                setOccupation(fetched.occupation || "");
            } catch (err: any) {
                console.error("Failed to load student:", err);

                setError(
                    err?.response?.data?.message ||
                    "Unable to load the student. Please try again."
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadStudent();

        return () => {
            cancelled = true;
        };
    }, [studentId]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (mode === "contact") {
            if (!email.trim()) {
                setError("Email is required.");
                return;
            }
            if (!phoneNumber.trim()) {
                setError("Phone number is required.");
                return;
            }
        } else {
            if (!firstName.trim() || !lastName.trim()) {
                setError("First and last name are required.");
                return;
            }
        }

        setSaving(true);

        try {
            if (mode === "contact") {
                await studentApi.update(studentId, {
                    contact: {
                        email: email.trim(),
                        phoneNumber: phoneNumber.trim(),
                    },
                });
            } else {
                await studentApi.update(studentId, {
                    fullName: {
                        firstName: firstName.trim(),
                        middleName: middleName.trim(),
                        lastName: lastName.trim(),
                    },
                    dateOfBirth,
                    nationality: nationality.trim(),
                    occupation: occupation.trim(),
                });
            }

            setSuccess("Student updated successfully.");

            setTimeout(() => {
                router.push(`/students/${studentId}`);
                router.refresh();
            }, 700);
        } catch (err: any) {
            console.error("Failed to update student:", err);

            setError(
                err?.response?.data?.message ||
                "Unable to update the student. Please check the details and try again."
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <main className="min-h-[calc(100vh-80px)] bg-zinc-50 px-4 py-8 dark:bg-zinc-950">
                <div className="mx-auto flex max-w-400 items-center justify-center py-24">
                    <div className="flex flex-col items-center gap-3 text-zinc-500 dark:text-zinc-400">
                        <Loader2
                            size={28}
                            className="animate-spin text-orange-500"
                        />

                        <p className="text-sm">
                            Loading student...
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    if (error && !student) {
        return (
            <main className="min-h-[calc(100vh-80px)] bg-zinc-50 px-4 py-8 dark:bg-zinc-950">
                <div className="mx-auto max-w-400">
                    <Link
                        href={`/students/${studentId}`}
                        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0B1E3D] transition hover:text-orange-600 dark:text-white dark:hover:text-orange-400"
                    >
                        <ArrowLeft size={16} />
                        Back to Student
                    </Link>

                    <div className="border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/50 dark:bg-zinc-900">
                        <div className="flex items-start gap-3">
                            <AlertCircle
                                size={20}
                                className="mt-0.5 shrink-0 text-red-500"
                            />

                            <div>
                                <h1 className="text-sm font-bold text-red-700 dark:text-red-400">
                                    Unable to load student
                                </h1>

                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    {error}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-zinc-50 px-4 py-8 dark:bg-zinc-950 sm:px-6">
            <div className="mx-auto max-w-400">
                {/* Back */}
                <Link
                    href={`/students/${studentId}`}
                    className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0B1E3D] transition hover:text-orange-600 dark:text-white dark:hover:text-orange-400"
                >
                    <ArrowLeft size={16} />
                    Back to Student
                </Link>

                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#0B1E3D]/5 text-[#0B1E3D] dark:bg-orange-400/10 dark:text-orange-400">
                            <User size={18} />
                        </div>

                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
                                Student Record
                            </p>

                            <h1 className="text-xl font-bold text-[#0B1E3D] dark:text-white">
                                Edit Student
                            </h1>
                        </div>
                    </div>

                    {student && (
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                            Update personal details for{" "}
                            <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                                {student.fullName.firstName}{" "}
                                {student.fullName.middleName}{" "}
                                {student.fullName.lastName}
                            </span>
                        </p>
                    )}
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="overflow-hidden border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                    <div className="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-[#0B1E3D] dark:text-white">
                                    Student Details
                                </h2>

                                <p className="mt-1 text-xs text-zinc-400">
                                    {mode === "contact"
                                        ? "Update the contact email and phone number."
                                        : "Update name, date of birth and background details."}
                                </p>
                            </div>

                            {/* Mode toggle */}
                            <div
                                role="tablist"
                                aria-label="Edit mode"
                                className="inline-flex shrink-0 self-start border border-zinc-200 dark:border-zinc-700"
                            >
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={mode === "contact"}
                                    onClick={() => {
                                        setMode("contact");
                                        setError("");
                                        setSuccess("");
                                    }}
                                    disabled={saving}
                                    className={`px-3 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${mode === "contact"
                                            ? "bg-[#0B1E3D] text-white dark:bg-orange-500"
                                            : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                        }`}
                                >
                                    Contact
                                </button>

                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={mode === "personal"}
                                    onClick={() => {
                                        setMode("personal");
                                        setError("");
                                        setSuccess("");
                                    }}
                                    disabled={saving}
                                    className={`px-3 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${mode === "personal"
                                            ? "bg-[#0B1E3D] text-white dark:bg-orange-500"
                                            : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                        }`}
                                >
                                    Personal
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 px-6 py-6">
                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                                <AlertCircle
                                    size={17}
                                    className="mt-0.5 shrink-0"
                                />

                                <span>{error}</span>
                            </div>
                        )}

                        {/* Success */}
                        {success && (
                            <div className="flex items-start gap-3 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                                <CheckCircle2
                                    size={17}
                                    className="mt-0.5 shrink-0"
                                />

                                <span>{success}</span>
                            </div>
                        )}

                        {/* Contact fields */}
                        {mode === "contact" && (
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300"
                                    >
                                        Email
                                    </label>

                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(event) =>
                                            setEmail(event.target.value)
                                        }
                                        disabled={saving}
                                        required
                                        className="w-full border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0B1E3D] outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/10 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:disabled:bg-zinc-800"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="phoneNumber"
                                        className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300"
                                    >
                                        Phone Number
                                    </label>

                                    <input
                                        id="phoneNumber"
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(event) =>
                                            setPhoneNumber(event.target.value)
                                        }
                                        disabled={saving}
                                        required
                                        className="w-full border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0B1E3D] outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/10 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:disabled:bg-zinc-800"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Personal fields */}
                        {mode === "personal" && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                    <div>
                                        <label
                                            htmlFor="firstName"
                                            className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300"
                                        >
                                            First Name
                                        </label>

                                        <input
                                            id="firstName"
                                            type="text"
                                            value={firstName}
                                            onChange={(event) =>
                                                setFirstName(event.target.value)
                                            }
                                            disabled={saving}
                                            required
                                            className="w-full border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0B1E3D] outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/10 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:disabled:bg-zinc-800"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="middleName"
                                            className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300"
                                        >
                                            Middle Name
                                        </label>

                                        <input
                                            id="middleName"
                                            type="text"
                                            value={middleName}
                                            onChange={(event) =>
                                                setMiddleName(event.target.value)
                                            }
                                            disabled={saving}
                                            className="w-full border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0B1E3D] outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/10 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:disabled:bg-zinc-800"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="lastName"
                                            className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300"
                                        >
                                            Last Name
                                        </label>

                                        <input
                                            id="lastName"
                                            type="text"
                                            value={lastName}
                                            onChange={(event) =>
                                                setLastName(event.target.value)
                                            }
                                            disabled={saving}
                                            required
                                            className="w-full border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0B1E3D] outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/10 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:disabled:bg-zinc-800"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                    <div>
                                        <label
                                            htmlFor="dateOfBirth"
                                            className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300"
                                        >
                                            Date of Birth
                                        </label>

                                        <input
                                            id="dateOfBirth"
                                            type="date"
                                            value={dateOfBirth}
                                            onChange={(event) =>
                                                setDateOfBirth(event.target.value)
                                            }
                                            disabled={saving}
                                            className="w-full border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0B1E3D] outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/10 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:disabled:bg-zinc-800"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="nationality"
                                            className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300"
                                        >
                                            Nationality
                                        </label>

                                        <input
                                            id="nationality"
                                            type="text"
                                            value={nationality}
                                            onChange={(event) =>
                                                setNationality(event.target.value)
                                            }
                                            disabled={saving}
                                            className="w-full border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0B1E3D] outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/10 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:disabled:bg-zinc-800"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="occupation"
                                            className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300"
                                        >
                                            Occupation
                                        </label>

                                        <input
                                            id="occupation"
                                            type="text"
                                            value={occupation}
                                            onChange={(event) =>
                                                setOccupation(event.target.value)
                                            }
                                            disabled={saving}
                                            className="w-full border border-zinc-200 bg-white px-4 py-3 text-sm text-[#0B1E3D] outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/10 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:disabled:bg-zinc-800"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() =>
                                router.push(`/students/${studentId}`)
                            }
                            disabled={saving}
                            className="inline-flex items-center justify-center gap-2 border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving || !student}
                            className="inline-flex items-center justify-center gap-2 bg-[#0B1E3D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#102c57] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-orange-500 dark:hover:bg-orange-600"
                        >
                            {saving ? (
                                <>
                                    <Loader2
                                        size={16}
                                        className="animate-spin"
                                    />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    {mode === "contact"
                                        ? "Save Contact"
                                        : "Save Personal Details"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}