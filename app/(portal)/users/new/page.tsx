"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus, Eye, EyeOff, Loader2 } from "lucide-react";
import { userApi } from "@/app/types/users";
import { studentApi } from "@/app/types/students";
import { UserRole } from "@/app/lib/types";
import { CloudinaryUpload } from "@/app/components/ui/cloudinary";
import RequireRole from "@/app/components/navigation/RequireRole";

const DEFAULT_STUDENT_PASSWORD = "austra student";

function NewUserForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: DEFAULT_STUDENT_PASSWORD,
    confirmPassword: DEFAULT_STUDENT_PASSWORD,
    role: "student" as UserRole,
    profileImage: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingStudent, setFetchingStudent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch student details if studentId query param exists
  useEffect(() => {
    if (!studentId) return;

    const fetchStudentDetails = async () => {
      setFetchingStudent(true);
      try {
        const response = await studentApi.getById(studentId);
        const student = response.data;

        // Construct full name from student structure
        const nameParts = [
          student.fullName?.firstName,
          student.fullName?.middleName,
          student.fullName?.lastName,
        ]
          .filter(Boolean)
          .join(" ");

        setFormData((prev) => ({
          ...prev,
          name: nameParts || prev.name,
          email: student.contact?.email || prev.email,
          role: "student",
          password: DEFAULT_STUDENT_PASSWORD,
          confirmPassword: DEFAULT_STUDENT_PASSWORD,
        }));
      } catch (err) {
        console.error("Failed to fetch student details:", err);
        setError("Could not auto-fill details from the specified student ID.");
      } finally {
        setFetchingStudent(false);
      }
    };

    fetchStudentDetails();
  }, [studentId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      // If role changes to 'student', set default password; clear it if changing away from student
      if (name === "role") {
        const isStudent = value === "student";
        return {
          ...prev,
          role: value as UserRole,
          password: isStudent ? DEFAULT_STUDENT_PASSWORD : "",
          confirmPassword: isStudent ? DEFAULT_STUDENT_PASSWORD : "",
        };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        profileImage: formData.profileImage.trim() || undefined,
      };

      await userApi.create(payload);

      // Navigate back to student details page if originating from a student, else to users list
      if (studentId) {
        router.push(`/students/${studentId}`);
      } else {
        router.push("/users");
      }
      router.refresh();
    } catch (err: any) {
      if (err.response?.data?.message) {
        const msg = err.response.data.message;
        setError(Array.isArray(msg) ? msg.join(", ") : msg);
      } else {
        setError("Failed to create user. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const backLink = studentId ? `/students/${studentId}` : "/users";

  return (
    <div className="max-w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header & Back Button */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href={backLink}
            className="rounded-sm p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-[#082B66] dark:hover:bg-zinc-800 dark:hover:text-orange-400"
            title={studentId ? "Back to Student Details" : "Back to Users"}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Create New User
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {studentId
                ? "Create a user account for this student."
                : "Add a new staff, admin, or student user to Austra Training Institute."}
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="rounded-sm border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        {fetchingStudent && (
          <div className="mb-6 flex items-center space-x-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading student information...</span>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Jane Doe"
              className="w-full rounded-sm border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
            />
          </div>

          {/* Email Address */}
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. j.doe@austra.edu"
              className="w-full rounded-sm border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
            />
          </div>

          {/* Role */}
          <div>
            <label
              htmlFor="role"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              User Role <span className="text-red-500">*</span>
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full rounded-sm border border-zinc-200 bg-white px-3.5 py-2.5 text-sm capitalize text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
            >
              <option value="student">Student</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
              <option value="registrar">Registrar</option>
            </select>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                className="w-full rounded-sm border border-zinc-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={6}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                className="w-full rounded-sm border border-zinc-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Cloudinary Profile Image Component */}
          <CloudinaryUpload
            value={formData.profileImage}
            onChange={(url) =>
              setFormData((prev) => ({ ...prev, profileImage: url }))
            }
            preset="photos"
            label="Profile Image"
            disabled={loading}
          />

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <Link
              href={backLink}
              className="rounded-sm border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || fetchingStudent}
              className="flex items-center space-x-2 rounded-sm bg-[#082B66] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#082B66]/90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-orange-400 dark:text-zinc-950 dark:hover:bg-orange-300"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create User</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewUserPage() {
  return (
    <RequireRole roles={["admin"]}>
      <Suspense
        fallback={
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        }
      >
        <NewUserForm />
      </Suspense>
    </RequireRole>
  );
}