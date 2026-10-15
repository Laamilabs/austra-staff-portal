"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  GraduationCap,
  Loader2,
  RefreshCw,
  User as UserIcon,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import api from "@/app/lib/api";
import { User } from "@/app/lib/types";
import {
  DepartmentRef,
  Faculty,
  UpdateFacultyPayload,
} from "@/app/types/faculty";
import AssignUserModal from "../AssignUserModal"; // Adjust import path if needed
import RequireRole from "@/app/components/navigation/RequireRole";

export default function EditFacultyPage() {
  const params = useParams();
  const router = useRouter();
  const facultyId = params.id as string;

  // Metadata / Lookup Options
  const [departments, setDepartments] = useState<DepartmentRef[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Page State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState<UpdateFacultyPayload>({
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

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [facultyRes, deptRes, usersRes] = await Promise.all([
        api.get<Faculty>(`/faculty/${facultyId}`),
        api.get<DepartmentRef[]>("/departments").catch(() => ({ data: [] })),
        api.get<User[]>("/users").catch(() => ({ data: [] })),
      ]);

      const faculty = facultyRes.data;

      setDepartments(deptRes.data || []);
      setUsers(usersRes.data || []);

      const departmentId =
        typeof faculty.department === "object" && faculty.department !== null
          ? faculty.department._id
          : faculty.department || "";

      const userId =
        typeof faculty.user === "object" && faculty.user !== null
          ? faculty.user.id || (faculty.user as any)._id || ""
          : faculty.user || "";

      const courseIds = (faculty.courses || []).map((course) =>
        typeof course === "object" && course !== null ? course._id : course,
      );

      setFormData({
        name: faculty.name || "",
        staffNo: faculty.staffNo || "",
        user: userId,
        qualification: faculty.qualification || "",
        expertise: faculty.expertise || "",
        description: faculty.description || "",
        department: departmentId,
        courses: courseIds,
        documents: faculty.documents || [],
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        "Failed to load faculty information. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (facultyId) {
      fetchData();
    }
  }, [facultyId]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Callback from AssignUserModal
  const handleAssignUser = async (selectedUserId: string) => {
    setFormData((prev) => ({ ...prev, user: selectedUserId }));
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.staffNo || !formData.department) {
      setError("Please fill in all required fields (Name, Staff No, Department).");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload: UpdateFacultyPayload = {
        name: formData.name,
        staffNo: formData.staffNo,
        qualification: formData.qualification,
        expertise: formData.expertise,
        description: formData.description,
        department: formData.department,
        courses: formData.courses || [],
        documents: formData.documents || [],
      };

      if (formData.user) {
        payload.user = formData.user;
      }

      await api.patch(`/faculty/${facultyId}`, payload);
      router.push(`/faculty/${facultyId}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(
        Array.isArray(msg)
          ? msg.join(", ")
          : msg || "Failed to update faculty member. Please check the fields and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Selected User Object
  const selectedUser = users.find(
    (u) => (u.id || (u as any)._id) === formData.user,
  );

  if (loading) {
    return (
      <RequireRole role="admin">
        <main className="min-h-full bg-zinc-50 py-8 dark:bg-zinc-950">
          <div className="mx-auto max-w-3xl px-4">
            <div className="flex h-64 items-center justify-center rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin text-[#082B66] dark:text-orange-400" />
                <span className="text-sm font-medium">Loading faculty data...</span>
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
        <div className="mx-auto max-w-400 px-4 py-6 sm:px-6 lg:px-8">
          {/* Back Link */}
          <div className="mb-6">
            <Link
              href={`/faculty/${facultyId}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-[#082B66] dark:text-zinc-400 dark:hover:text-orange-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel and Return
            </Link>
          </div>

          {/* Page Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Edit Faculty Member
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Update academic profile, staff details, and assigned user accounts.
              </p>
            </div>
          </div>

          {/* Form Error Banner */}
          {error && (
            <div className="mb-6 flex items-center justify-between rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <span>{error}</span>
              <button
                type="button"
                onClick={fetchData}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reload
              </button>
            </div>
          )}

          {/* Edit Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-sm border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-white">
                <Users className="h-4 w-4 text-[#082B66] dark:text-orange-400" />
                Basic Information
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {/* Full Name */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name || ""}
                    onChange={handleChange}
                    placeholder="e.g. Dr. Felix Ongeri"
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
                    value={formData.staffNo || ""}
                    onChange={handleChange}
                    placeholder="e.g. ATI/001"
                    className="mt-1.5 w-full rounded-sm border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
                  />
                </div>

                {/* Department */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <select
                      name="department"
                      required
                      value={formData.department || ""}
                      onChange={handleChange}
                      className="w-full rounded-sm border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
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

                {/* Linked User Account (Modal Trigger Display) */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Linked User Account
                  </label>
                  <div className="mt-1.5">
                    {selectedUser ? (
                      <div className="flex items-center justify-between rounded-sm border border-zinc-200 bg-zinc-50 px-3.5 py-2 dark:border-zinc-700 dark:bg-zinc-950">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#082B66]/10 text-[#082B66] dark:bg-orange-400/10 dark:text-orange-400">
                            <UserCheck className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-zinc-900 dark:text-white">
                              {selectedUser.name}
                            </p>
                            <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                              {selectedUser.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="rounded-sm border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="flex w-full items-center justify-between rounded-sm border border-dashed border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-500 transition hover:border-[#082B66] hover:bg-zinc-100 hover:text-[#082B66] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:border-orange-400 dark:hover:text-orange-400"
                      >
                        <span className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Select & Link System User Account
                        </span>
                        <span className="rounded-sm bg-zinc-200/60 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          Browse
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Qualifications & Expertise */}
            <div className="rounded-sm border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-white">
                <GraduationCap className="h-4 w-4 text-[#082B66] dark:text-orange-400" />
                Academic Credentials
              </h2>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Qualification
                  </label>
                  <input
                    type="text"
                    name="qualification"
                    value={formData.qualification || ""}
                    onChange={handleChange}
                    placeholder="e.g. M.Sc. in Biotechnology, Ph.D. in Computer Science"
                    className="mt-1.5 w-full rounded-sm border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Area of Expertise
                  </label>
                  <input
                    type="text"
                    name="expertise"
                    value={formData.expertise || ""}
                    onChange={handleChange}
                    placeholder="e.g. Curriculum Development, Molecular Biology"
                    className="mt-1.5 w-full rounded-sm border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Description / Bio
                  </label>
                  <textarea
                    name="description"
                    rows={4}
                    value={formData.description || ""}
                    onChange={handleChange}
                    placeholder="Brief summary of professional experience, research, and responsibilities..."
                    className="mt-1.5 w-full rounded-sm border border-zinc-200 bg-zinc-50 p-3.5 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href={`/faculty/${facultyId}`}
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
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Assign User Modal Component */}
        <AssignUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAssignUser}
          users={users}
          facultyName={formData.name || "Faculty Member"}
          currentUserId={formData.user as string}
          isReassign={Boolean(formData.user)}
        />
      </main>
    </RequireRole>
  );
}