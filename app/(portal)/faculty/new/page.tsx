"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Building,
    Check,
    FileText,
    GraduationCap,
    Loader2,
    Plus,
    Trash2,
    UserCheck,
    UserPlus,
    Users,
} from "lucide-react";

import api from "@/app/lib/api";
import { User } from "@/app/lib/types";
import {
    CreateFacultyPayload,
    DepartmentRef,
} from "@/app/types/faculty";
import { getUserId } from "@/app/utilities/userWithId";
import AssignUserModal from "../[id]/AssignUserModal";
import RequireRole from "@/app/components/navigation/RequireRole";

export default function CreateFacultyPage() {
    const router = useRouter();

    // Lookup Options
    const [departments, setDepartments] = useState<DepartmentRef[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    // Modal State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    // Form & UI States
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Dynamic Array Input States
    const [newCourseInput, setNewCourseInput] = useState("");
    const [newDocInput, setNewDocInput] = useState("");

    // Form State
    const [formData, setFormData] = useState<CreateFacultyPayload>({
        name: "",
        staffNo: "",
        user: "",
        qualification: "",
        expertise: "",
        description: "",
        department: "",
        courses: [],
        documents: [],
    });

    // Fetch Lookup Data (Departments & Available Users)
    useEffect(() => {
        const fetchDropdownData = async () => {
            try {
                setLoadingInitial(true);
                const [deptRes, usersRes] = await Promise.all([
                    api.get<DepartmentRef[]>("/departments").catch(() => ({ data: [] })),
                    api.get<User[]>("/users").catch(() => ({ data: [] })),
                ]);

                setDepartments(deptRes.data || []);
                setUsers(usersRes.data || []);
            } catch (err: any) {
                setError("Failed to load initial form data. Please refresh.");
            } finally {
                setLoadingInitial(false);
            }
        };

        fetchDropdownData();
    }, []);

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // User Assignment via AssignUserModal
    const handleAssignUserSubmit = async (userId: string) => {
        setFormData((prev) => ({ ...prev, user: userId }));
    };

    // Add Course ID / Reference
    const handleAddCourse = () => {
        if (!newCourseInput.trim()) return;
        setFormData((prev) => ({
            ...prev,
            courses: [...prev.courses, newCourseInput.trim()],
        }));
        setNewCourseInput("");
    };

    const handleRemoveCourse = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            courses: prev.courses.filter((_, i) => i !== index),
        }));
    };

    // Add Document URL / Name
    const handleAddDocument = () => {
        if (!newDocInput.trim()) return;
        setFormData((prev) => ({
            ...prev,
            documents: [...prev.documents, newDocInput.trim()],
        }));
        setNewDocInput("");
    };

    const handleRemoveDocument = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            documents: prev.documents.filter((_, i) => i !== index),
        }));
    };

    // Submit Handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.staffNo || !formData.department) {
            setError("Please fill in all required fields (Name, Staff No, Department).");
            return;
        }

        try {
            setSubmitting(true);
            setError("");

            const payload: CreateFacultyPayload = {
                name: formData.name,
                staffNo: formData.staffNo,
                qualification: formData.qualification || "",
                expertise: formData.expertise || "",
                description: formData.description || "",
                department: formData.department,
                courses: formData.courses,
                documents: formData.documents,
            };

            if (formData.user) {
                payload.user = formData.user;
            }

            const res = await api.post("/faculty", payload);
            const newFacultyId = res.data?._id || res.data?.id;

            if (newFacultyId) {
                router.push(`/faculty/${newFacultyId}`);
            } else {
                router.push("/faculty");
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message;
            setError(
                Array.isArray(msg)
                    ? msg.join(", ")
                    : msg || "Failed to create faculty member. Please review the details."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const selectedUserObj = users.find((u) => getUserId(u) === formData.user);

    if (loadingInitial) {
        return (
            <RequireRole role="admin">
                <main className="min-h-full bg-zinc-50 py-8 dark:bg-zinc-950">
                    <div className="mx-auto max-w-full">
                        <div className="flex h-64 items-center justify-center rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
                                <Loader2 className="h-5 w-5 animate-spin text-[#082B66] dark:text-orange-400" />
                                <span className="text-sm font-medium">Loading form details...</span>
                            </div>
                        </div>
                    </div>
                </main>
            </RequireRole>
        );
    }

    return (
        <RequireRole role="admin">
            <main className="min-h-full bg-zinc-50 pb-12 dark:bg-zinc-950">
                <div className="mx-auto max-w-full py-6 sm:px-6 lg:px-8">
                    {/* Back Link */}
                    <div className="mb-6">
                        <Link
                            href="/faculty"
                            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-[#082B66] dark:text-zinc-400 dark:hover:text-orange-400"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Faculty List
                        </Link>
                    </div>

                    {/* Page Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                            Add New Faculty Member
                        </h1>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Register a new faculty member, assign credentials, and link accounts.
                        </p>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="mb-6 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Section 1: Basic & Identification */}
                        <div className="rounded-sm border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                            <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-white">
                                <Users className="h-4 w-4 text-[#082B66] dark:text-orange-400" />
                                Basic Information
                            </h2>

                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                {/* Name */}
                                <div className="sm:col-span-1">
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="e.g. Dr. Jane Doe"
                                        className="mt-1.5 w-full rounded-sm border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
                                    />
                                </div>

                                {/* Staff Number */}
                                <div className="sm:col-span-1">
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Staff Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="staffNo"
                                        required
                                        value={formData.staffNo}
                                        onChange={handleChange}
                                        placeholder="e.g. FAC/2026/04"
                                        className="mt-1.5 w-full rounded-sm border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
                                    />
                                </div>

                                {/* Department Select */}
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Department <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="department"
                                        required
                                        value={formData.department}
                                        onChange={handleChange}
                                        className="mt-1.5 w-full rounded-sm border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
                                    >
                                        <option value="">-- Select Department --</option>
                                        {departments.map((dept) => (
                                            <option key={dept._id} value={dept._id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Account Linking */}
                        <div className="rounded-sm border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="flex items-center justify-between">
                                <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-white">
                                    <UserCheck className="h-4 w-4 text-[#082B66] dark:text-orange-400" />
                                    User Account Link
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setIsAssignModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                >
                                    <UserPlus className="h-3.5 w-3.5" />
                                    {formData.user ? "Change User" : "Select User"}
                                </button>
                            </div>

                            <div className="mt-4">
                                {selectedUserObj ? (
                                    <div className="flex items-center justify-between rounded-sm border border-[#082B66]/20 bg-[#082B66]/5 p-3.5 dark:border-orange-400/30 dark:bg-orange-400/10">
                                        <div>
                                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                                {selectedUserObj.name}
                                            </p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                {selectedUserObj.email} • {selectedUserObj.role}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData((prev) => ({ ...prev, user: "" }))}
                                            className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                                        >
                                            Unlink
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        No user account linked yet. Click &quot;Select User&quot; above to associate a system user.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Section 3: Credentials & Profile */}
                        <div className="rounded-sm border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                            <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-white">
                                <GraduationCap className="h-4 w-4 text-[#082B66] dark:text-orange-400" />
                                Credentials & Overview
                            </h2>

                            <div className="mt-4 space-y-4">
                                {/* Qualification */}
                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Qualification
                                    </label>
                                    <input
                                        type="text"
                                        name="qualification"
                                        value={formData.qualification}
                                        onChange={handleChange}
                                        placeholder="e.g. Ph.D. in Computer Engineering"
                                        className="mt-1.5 w-full rounded-sm border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
                                    />
                                </div>

                                {/* Expertise */}
                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Area of Expertise
                                    </label>
                                    <input
                                        type="text"
                                        name="expertise"
                                        value={formData.expertise}
                                        onChange={handleChange}
                                        placeholder="e.g. Distributed Systems, Machine Learning"
                                        className="mt-1.5 w-full rounded-sm border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Bio / Description
                                    </label>
                                    <textarea
                                        name="description"
                                        rows={4}
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Provide background, research interests, and administrative duties..."
                                        className="mt-1.5 w-full rounded-sm border border-zinc-200 bg-zinc-50 p-3.5 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Courses & Documents */}
                        <div className="rounded-sm border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                            <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-white">
                                <FileText className="h-4 w-4 text-[#082B66] dark:text-orange-400" />
                                Courses & Documents
                            </h2>

                            {/* Courses List Input */}
                            <div className="mt-4">
                                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                    Assigned Course IDs
                                </label>
                                <div className="mt-1.5 flex gap-2">
                                    <input
                                        type="text"
                                        value={newCourseInput}
                                        onChange={(e) => setNewCourseInput(e.target.value)}
                                        placeholder="Enter Mongo Course ID"
                                        className="flex-1 rounded-sm border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCourse}
                                        className="inline-flex items-center gap-1 rounded-sm bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add
                                    </button>
                                </div>

                                {formData.courses.length > 0 && (
                                    <ul className="mt-2.5 divide-y divide-zinc-100 rounded-sm border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                                        {formData.courses.map((courseId, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-center justify-between px-3.5 py-2 text-xs text-zinc-700 dark:text-zinc-300"
                                            >
                                                <span className="font-mono">{courseId}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCourse(idx)}
                                                    className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Documents List Input */}
                            <div className="mt-6">
                                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                    Document Links / File References
                                </label>
                                <div className="mt-1.5 flex gap-2">
                                    <input
                                        type="text"
                                        value={newDocInput}
                                        onChange={(e) => setNewDocInput(e.target.value)}
                                        placeholder="e.g. https://docs.example.com/cv.pdf"
                                        className="flex-1 rounded-sm border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddDocument}
                                        className="inline-flex items-center gap-1 rounded-sm bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add
                                    </button>
                                </div>

                                {formData.documents.length > 0 && (
                                    <ul className="mt-2.5 divide-y divide-zinc-100 rounded-sm border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                                        {formData.documents.map((doc, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-center justify-between px-3.5 py-2 text-xs text-zinc-700 dark:text-zinc-300"
                                            >
                                                <span className="truncate pr-2 font-mono">{doc}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveDocument(idx)}
                                                    className="shrink-0 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <Link
                                href="/faculty"
                                className="rounded-sm border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                                Cancel
                            </Link>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex items-center gap-2 rounded-sm bg-[#082B66] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#082B66]/90 disabled:opacity-50 dark:bg-orange-400 dark:text-zinc-950 dark:hover:bg-orange-300"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4" />
                                        Create Faculty Member
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Modal for User Selection */}
                <AssignUserModal
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    onSubmit={handleAssignUserSubmit}
                    users={users}
                    facultyName={formData.name || "New Faculty Member"}
                    currentUserId={formData.user}
                />
            </main>
        </RequireRole>
    );
}