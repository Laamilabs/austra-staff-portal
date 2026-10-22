"use client";

import { use, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  User as UserIcon,
  UserPlus,
  UserCheck,
  MapPin,
  AlertCircle,
  Loader2,
  BadgeCheck,
  ShieldAlert,
  Camera,
  Pencil,
} from "lucide-react";

import { Student, studentApi } from "@/app/types/students";
import { userApi } from "@/app/types/users";
import { User } from "@/app/lib/types";
import GenerateStudentQr from "../components/generateStudentQr";
import SelectUserModal from "../components/SelectUserModal";
import ChangeProfileImageModal from "../components/ChangeProfileImageModal";
import { formatDate } from "../components/formatters";
import EnrolledCourses from "./sections/EnrolledCourses";
import StudentDocuments from "./sections/student-documents";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface PopulatedUser {
  _id: string;
  email?: string;
  profileImage?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: string;
  [key: string]: unknown;
}

export default function StudentDetailsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  /* ------------------------------ Fetch ------------------------------ */

  const [refreshing, setRefreshing] = useState(false);
  const fetchStudent = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!studentId) return;
      const silent = opts?.silent ?? false;

      try {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        setError("");

        const response = await studentApi.getById(studentId);
        setStudent(response.data);
      } catch (err: any) {
        console.error("Failed to fetch student details:", err);
        const status = err?.response?.status;
        if (status === 404) setError("Student not found.");
        else if (status === 400) setError("Invalid student ID.");
        else setError("Failed to load student details. Please try again.");
      } finally {
        if (!silent) setLoading(false);
        else setRefreshing(false);
      }
    },
    [studentId],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!studentId || cancelled) return;
      await fetchStudent();
    })();

    return () => {
      cancelled = true;
    };
  }, [studentId, fetchStudent]);

  /* --------------------------- Assign User --------------------------- */
  const handleAssignUser = async (user: User) => {
    if (!student) return;

    await (studentApi as any).update(student._id, {
      userId: user.id || (user as any)._id,
    });

    await fetchStudent();
  };

  /* ------------------------ Profile image ------------------------ */
  const getUserId = useCallback((): string | null => {
    if (!student?.userId) return null;
    if (typeof student.userId === "string") return student.userId;

    const populated = student.userId as PopulatedUser;
    return populated._id || null;
  }, [student]);

  const openImageModal = () => {
    if (!getUserId()) return;
    setShowImageModal(true);
  };

  const handleSaveProfileImage = async (imageUrl: string) => {
    const userId = getUserId();
    if (!userId) return;

    await userApi.updateProfileImage(userId, { profileImage: imageUrl });
    await fetchStudent();
  };

  const profileImageValue: string | null =
    student?.userId &&
      typeof student.userId === "object" &&
      (student.userId as PopulatedUser).profileImage
      ? ((student.userId as PopulatedUser).profileImage as string)
      : null;

  /* ------------------------------ Loading ------------------------------ */
  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#0B1E3D] dark:text-orange-400" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Loading student details...
          </p>
        </div>
      </main>
    );
  }

  /* ------------------------------- Error ------------------------------- */
  if (error || !student) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-full py-8 sm:px-6 lg:px-8">
          <Link
            href="/students"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-[#0B1E3D] dark:text-zinc-400 dark:hover:text-orange-400"
          >
            <ArrowLeft size={16} />
            Back to Students
          </Link>

          <div className="mt-8 rounded-sm border border-red-200 border-t-4 border-t-red-600 bg-red-50 p-6 shadow-sm dark:border-red-900/50 dark:bg-red-950/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <h1 className="text-lg font-bold text-red-800 dark:text-red-300">
                  Unable to load student
                </h1>
                <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-400">
                  {error || "Student not found."}
                </p>
              </div>
            </div>

            <Link
              href="/students"
              className="mt-5 inline-flex items-center gap-2 rounded-sm bg-[#0B1E3D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#10294d] dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
            >
              <ArrowLeft size={15} />
              Return to Students
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /* ------------------------------- Ready ------------------------------- */
  const fullName = [
    student.fullName.firstName,
    student.fullName.middleName,
    student.fullName.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const initials =
    `${student.fullName.firstName?.[0] ?? ""}${student.fullName.lastName?.[0] ?? ""
      }`.toUpperCase() || "?";

  const hasUser = Boolean(student.userId);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-full py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* BACK NAVIGATION */}
        <Link
          href="/students"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-[#0B1E3D] dark:text-zinc-400 dark:hover:text-orange-400"
        >
          <ArrowLeft size={16} />
          Back to Students
        </Link>

        {/* ================================ HERO ================================ */}
        <section className="mt-5 overflow-hidden rounded-sm border-b-2 border-orange-400 bg-[#0B1E3D] shadow-sm">
          <div className="flex flex-col md:flex-row md:items-stretch">
            {/* PROFILE IMAGE — flush-left panel, full height on md+ */}
            <div
              className={`group relative h-64 w-full shrink-0 overflow-hidden border-b-2 border-orange-400/70 bg-zinc-800 sm:h-72 md:h-auto md:w-48 md:border-b-0 md:border-r-2 md:border-r-orange-400/70 lg:w-56 ${hasUser
                ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400/60"
                : ""
                }`}
              onClick={hasUser ? openImageModal : undefined}
              role={hasUser ? "button" : undefined}
              tabIndex={hasUser ? 0 : undefined}
              aria-label={hasUser ? "Change profile image" : undefined}
              onKeyDown={
                hasUser
                  ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openImageModal();
                    }
                  }
                  : undefined
              }
              title={hasUser ? "Click to change profile image" : undefined}
            >
              {profileImageValue ? (
                <Image
                  src={profileImageValue}
                  alt={fullName}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 192px, 224px"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#0B1E3D] to-zinc-800 text-5xl font-bold uppercase tracking-wider text-orange-400 lg:text-6xl">
                  {initials}
                </div>
              )}

              {hasUser && (
                <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-black/60 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Camera size={22} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em]">
                    Change Photo
                  </span>
                </div>
              )}
            </div>

            {/* DETAILS */}
            <div className="flex min-w-0 flex-1 flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:gap-8 md:p-8">
              <div className="min-w-0 flex-1 text-center md:text-left">
                {/* Eyebrow */}
                <div className="mb-3 flex items-center justify-center gap-2 md:justify-start">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">
                    Student Profile
                  </span>
                  <span className="h-px w-8 bg-orange-400/50" />
                </div>

                {/* Name — the visual anchor */}
                <h1 className="truncate text-2xl font-bold leading-tight tracking-tight text-white md:text-3xl lg:text-4xl">
                  {fullName}
                </h1>

                {/* Contact row — quiet, secondary */}
                <div className="mt-3 flex flex-col items-center gap-2 text-sm text-zinc-400 sm:flex-row sm:flex-wrap sm:justify-center md:justify-start">
                  {student.contact.email && (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail size={13} className="text-orange-400/80" />
                      <span className="truncate">{student.contact.email}</span>
                    </span>
                  )}

                  {student.contact.email && student.contact.phoneNumber && (
                    <span className="hidden h-3 w-px bg-white/15 sm:inline-block" />
                  )}

                  {student.contact.phoneNumber && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone size={13} className="text-orange-400/80" />
                      {student.contact.phoneNumber}
                    </span>
                  )}
                </div>

                {/* Attribute + status pills */}
                <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
                  <span className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                    <BadgeCheck size={12} className="text-orange-400" />
                    {student.gender}
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                    {student.maritalStatus}
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                    {student.nationality}
                  </span>

                  {student.religion && (
                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                      {student.religion}
                    </span>
                  )}

                  {hasUser ? (
                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                      <UserCheck size={12} />
                      User account linked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
                      <ShieldAlert size={12} />
                      No user account
                    </span>
                  )}
                </div>
                {/* Edit Student */}
                <div className="mt-5 flex justify-center md:justify-start">
                  <Link
                    href={`/students/${student._id}/edit`}
                    className="inline-flex items-center gap-2 rounded-sm border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-orange-400/50 hover:bg-orange-400/10 hover:text-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
                  >
                    <Pencil size={15} />
                    Edit Student
                  </Link>
                </div>
              </div>

              <div className="mx-auto shrink-0 md:mx-0">
                <GenerateStudentQr email={student.contact.email} />
              </div>
            </div>
          </div>
        </section>

        {/* ========================= ASSIGN USER CARD ========================= */}
        {!hasUser && (
          <section className="mt-6 overflow-hidden rounded-sm border border-zinc-200 border-t-4 border-t-amber-400 bg-white shadow-sm dark:border-zinc-800 dark:border-t-amber-400 dark:bg-zinc-900">
            <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                  <UserPlus size={20} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-bold text-[#0B1E3D] dark:text-white">
                    No user account linked
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                    This student doesn't have a login account yet. Create a
                    fresh user for them, or link an existing user so they can
                    access the portal.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center md:shrink-0">
                <Link
                  href={`/users/new?studentId=${student._id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#0B1E3D] bg-white px-4 py-2.5 text-sm font-semibold text-[#0B1E3D] transition-colors hover:bg-[#0B1E3D]/5 dark:border-orange-400 dark:bg-transparent dark:text-orange-400 dark:hover:bg-orange-400/10"
                >
                  <UserPlus size={15} />
                  Create New User
                </Link>

                <button
                  type="button"
                  onClick={() => setShowAssignModal(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#0B1E3D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#10294d] dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
                >
                  <UserCheck size={15} />
                  Assign Existing User
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ======================= ENROLLED COURSES ======================= */}
        <EnrolledCourses
          courses={student.courses}
          studentId={student._id}
          onChanged={() => fetchStudent({ silent: true })}
        />

        {/* ======================= STUDENT DOCUMENTS ====================== */}
        {/* ======================= STUDENT DOCUMENTS ====================== */}
        <StudentDocuments
          userId={getUserId()}
          studentId={student._id}
          className="mt-6"
        />

        {/* ==================== PERSONAL INFO + ADDRESS ==================== */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Personal Information */}
          <section className="overflow-hidden rounded-sm border border-zinc-200 border-t-4 border-t-[#0B1E3D] bg-white shadow-sm dark:border-zinc-800 dark:border-t-orange-400 dark:bg-zinc-900">
            <header className="flex items-center gap-3 border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D]/5 text-[#0B1E3D] dark:bg-orange-400/10 dark:text-orange-400">
                <UserIcon size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#0B1E3D] dark:text-white">
                  Personal Information
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Identity &amp; biographical details
                </p>
              </div>
            </header>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-6 sm:grid-cols-2">
              <Field label="Date of Birth">
                {formatDate(student.dateOfBirth)}
              </Field>
              <Field label="Occupation">{student.occupation || "—"}</Field>
              <Field label="ID Number">
                {student.identification.idNumber || "—"}
              </Field>
              <Field label="Passport Number">
                {student.identification.passportNumber || "—"}
              </Field>
              <Field label="Blood Group">
                {student.identification.bloodGroup || "—"}
              </Field>
              <Field label="Disability">
                {student.physicalDisability || "None"}
              </Field>
            </dl>
          </section>

          {/* Address Details */}
          <section className="overflow-hidden rounded-sm border border-zinc-200 border-t-4 border-t-[#0B1E3D] bg-white shadow-sm dark:border-zinc-800 dark:border-t-orange-400 dark:bg-zinc-900">
            <header className="flex items-center gap-3 border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D]/5 text-[#0B1E3D] dark:bg-orange-400/10 dark:text-orange-400">
                <MapPin size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#0B1E3D] dark:text-white">
                  Address Details
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Present &amp; permanent residence
                </p>
              </div>
            </header>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <AddressBlock
                label="Present Address"
                address={student.addresses.present.address}
                constituency={student.addresses.present.constituency}
                county={student.addresses.present.county}
                postalCode={student.addresses.present.postalCode}
              />
              <AddressBlock
                label="Permanent Address"
                address={student.addresses.permanent.address}
                constituency={student.addresses.permanent.constituency}
                county={student.addresses.permanent.county}
                postalCode={student.addresses.permanent.postalCode}
              />
            </div>
          </section>
        </div>

      </div>

      {/* ASSIGN USER MODAL */}
      <SelectUserModal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onSelect={handleAssignUser}
        targetName={fullName}
        defaultRoleFilter="student"
        email={student.contact.email}
        studentId={student._id}
      />

      {/* CHANGE PROFILE IMAGE MODAL */}
      <ChangeProfileImageModal
        open={showImageModal}
        onClose={() => setShowImageModal(false)}
        currentImageUrl={profileImageValue}
        initials={initials}
        targetName={fullName}
        onSave={handleSaveProfileImage}
        preset="photos"
      />
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Small helpers — keep the JSX above flat and consistent                     */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-[#0B1E3D] dark:text-white">
        {children}
      </dd>
    </div>
  );
}

function AddressBlock({
  label,
  address,
  constituency,
  county,
  postalCode,
}: {
  label: string;
  address?: string;
  constituency?: string;
  county?: string;
  postalCode?: string;
}) {
  return (
    <div className="px-6 py-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-medium text-[#0B1E3D] dark:text-white">
        {address}, {constituency}
      </p>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        {county} County · {postalCode}
      </p>
    </div>
  );
}