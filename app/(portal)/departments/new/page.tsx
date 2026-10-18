"use client";

import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  Loader2,
  UserRound,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import api from "@/app/lib/api";
import { CreateDepartmentDto, departmentApi } from "@/app/types/department";
import { Faculty } from "@/app/types/faculty";
import RequireRole from "@/app/components/navigation/RequireRole";
import { CloudinaryUpload } from "@/app/components/ui/cloudinary";

export default function NewDepartmentPage() {
  const router = useRouter();

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconLink, setIconLink] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState<string[]>([]);
  const [hod, setHod] = useState("");

  // Data fetching states
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [loadingFaculty, setLoadingFaculty] = useState<boolean>(true);

  // Form interaction states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch faculty list on mount
  useEffect(() => {
    async function fetchFaculty() {
      try {
        setLoadingFaculty(true);
        const response = await api.get<Faculty[]>("/faculty");
        setFacultyList(response.data);
      } catch (err: any) {
        console.error("Failed to load faculty list:", err);
      } finally {
        setLoadingFaculty(false);
      }
    }

    fetchFaculty();
  }, []);

  const toggleFaculty = (facultyId: string) => {
    setSelectedFaculty((current) =>
      current.includes(facultyId)
        ? current.filter((id) => id !== facultyId)
        : [...current, facultyId],
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Department name is required.");
      return;
    }

    if (!description.trim()) {
      setError("Department description is required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const data: CreateDepartmentDto = {
        name: name.trim(),
        description: description.trim(),
        ...(iconLink.trim() ? { iconLink: iconLink.trim() } : {}),
        ...(selectedFaculty.length > 0 ? { faculty: selectedFaculty } : {}),
        ...(hod ? { hod } : {}),
      };

      await departmentApi.create(data);

      router.push("/departments");
    } catch (err: any) {
      console.error("Failed to create department:", err);

      setError(
        err?.response?.data?.message ||
        "Failed to create department. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RequireRole role="admin">
      <main className="min-h-full bg-zinc-50 p-4 dark:bg-zinc-950 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-full">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-[#082B66] dark:text-zinc-400 dark:hover:text-orange-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Departments
          </button>

          {/* Page Heading */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-[#082B66]">
                <Building2 className="h-5 w-5 text-orange-400" />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  Create Department
                </h1>

                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Add a new academic department.
                </p>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Basic Information */}
              <section className="rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                  <h2 className="font-semibold text-zinc-900 dark:text-white">
                    Basic Information
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Enter the department's basic details.
                  </p>
                </div>

                <div className="space-y-5 p-5">
                  {/* Name */}
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Department Name
                    </label>

                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="e.g. Computer Science"
                      disabled={submitting}
                      className="w-full rounded-sm border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-orange-400 dark:focus:ring-orange-400/10 dark:disabled:bg-zinc-800"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label
                      htmlFor="description"
                      className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Description
                    </label>

                    <textarea
                      id="description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Describe the department..."
                      rows={5}
                      disabled={submitting}
                      className="w-full resize-none rounded-sm border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-orange-400 dark:focus:ring-orange-400/10 dark:disabled:bg-zinc-800"
                    />
                  </div>

                  {/* Icon Link */}
                  <div>
                    <CloudinaryUpload
                      value={iconLink}
                      onChange={(url) => setIconLink(url)}
                      preset="otherphotos"
                      label="Department Icon"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </section>

              {/* Faculty Selection */}
              <section className="rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[#082B66]/10 dark:bg-[#082B66]/30">
                      <Users className="h-4 w-4 text-[#082B66] dark:text-orange-400" />
                    </div>

                    <div>
                      <h2 className="font-semibold text-zinc-900 dark:text-white">
                        Faculty
                      </h2>

                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Select faculty members assigned to this department.
                      </p>
                    </div>
                  </div>
                </div>

                {loadingFaculty ? (
                  <div className="flex items-center justify-center p-8 text-zinc-500 dark:text-zinc-400">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading faculty members...</span>
                  </div>
                ) : facultyList.length === 0 ? (
                  <div className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No faculty members found.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {facultyList.map((member) => {
                      const selected = selectedFaculty.includes(member._id);

                      return (
                        <button
                          key={member._id}
                          type="button"
                          onClick={() => toggleFaculty(member._id)}
                          disabled={submitting}
                          className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed dark:hover:bg-zinc-800/40"
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm ${selected
                              ? "bg-[#082B66] dark:bg-orange-400"
                              : "bg-zinc-100 dark:bg-zinc-800"
                              }`}
                          >
                            <UserRound
                              className={`h-4 w-4 ${selected
                                ? "text-orange-400 dark:text-zinc-950"
                                : "text-zinc-500 dark:text-zinc-400"
                                }`}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                              {member.name}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                              {member.expertise ||
                                member.qualification ||
                                `Staff No: ${member.staffNo}`}
                            </p>
                          </div>

                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition ${selected
                              ? "border-[#082B66] bg-[#082B66] dark:border-orange-400 dark:bg-orange-400"
                              : "border-zinc-300 dark:border-zinc-600"
                              }`}
                          >
                            {selected && (
                              <Check className="h-3.5 w-3.5 text-white dark:text-zinc-950" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Head of Department Selection */}
              <section className="rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[#082B66]/10 dark:bg-[#082B66]/30">
                      <UserRound className="h-4 w-4 text-[#082B66] dark:text-orange-400" />
                    </div>

                    <div>
                      <h2 className="font-semibold text-zinc-900 dark:text-white">
                        Head of Department
                      </h2>

                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Select the faculty member who heads this department.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="relative">
                    <select
                      id="hod"
                      value={hod}
                      onChange={(e) => setHod(e.target.value)}
                      disabled={submitting || loadingFaculty}
                      className="w-full appearance-none rounded-sm border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10 dark:disabled:bg-zinc-800"
                    >
                      <option value="">Select a Head of Department...</option>
                      {facultyList.map((member) => (
                        <option key={member._id} value={member._id}>
                          {member.name} ({member.staffNo})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  </div>
                </div>
              </section>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={submitting}
                  className="rounded-sm border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-sm bg-[#082B66] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#082B66]/90 disabled:opacity-50 dark:bg-orange-400 dark:text-zinc-950 dark:hover:bg-orange-300"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Creating..." : "Create Department"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </RequireRole>
  );
}