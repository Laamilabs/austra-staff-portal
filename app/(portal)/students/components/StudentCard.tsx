"use client";

import { ArrowUpRight, GraduationCap, Sparkles } from "lucide-react";
import { Student } from "@/app/types/students";

interface ResolvedCourseResult {
  admissionNumber: string;
  courseName: string;
  isResolvedByAdmission: boolean;
}

interface StudentCardProps {
  student: Student;
  onClick: () => void;
  getResolvedCourse: (
    course: Student["courses"][number]
  ) => ResolvedCourseResult | null;
}

/** Courses shown on the card before collapsing into "+N more". */
const MAX_VISIBLE_COURSES = 3;

export function StudentCard({
  student,
  onClick,
  getResolvedCourse,
}: StudentCardProps) {
  const name = [
    student.fullName.firstName,
    student.fullName.middleName,
    student.fullName.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const initials =
    `${student.fullName.firstName?.charAt(0).toUpperCase() ?? ""}${student.fullName.lastName?.charAt(0).toUpperCase() ?? ""
    }` || "?";

  const visibleCourses = student.courses.slice(0, MAX_VISIBLE_COURSES);
  const hiddenCount = student.courses.length - visibleCourses.length;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open ${name}`}
      className="
        group flex h-full w-full flex-col gap-3 rounded-sm border p-4 text-left
        border-zinc-200/80 bg-white/80 transition-colors
        hover:border-[#0B1E3D]/40 hover:bg-white
        dark:border-white/10 dark:bg-white/4 dark:hover:border-orange-400/50 dark:hover:bg-white/8
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400
      "
    >
      {/* Identity */}
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D] text-sm font-bold text-orange-400 ring-1 ring-inset ring-orange-400/30">
          {initials}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[#0B1E3D] dark:text-white">
            {name}
          </span>
          <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
            {student.contact.email}
          </span>
        </span>

        <ArrowUpRight
          size={16}
          className="shrink-0 text-zinc-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-orange-500 dark:text-zinc-600 dark:group-hover:text-orange-400"
        />
      </div>

      {/* Courses, each paired with its admission number */}
      <div className="mt-auto space-y-1.5 border-t border-zinc-200/80 pt-3 dark:border-white/10">
        {student.courses.length === 0 ? (
          <p className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
            <GraduationCap
              size={15}
              className="shrink-0 text-zinc-300 dark:text-zinc-600"
            />
            Not enrolled
          </p>
        ) : (
          <>
            {visibleCourses.map((course, i) => {
              const resolved = getResolvedCourse(course);
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <GraduationCap
                    size={15}
                    strokeWidth={2}
                    className="shrink-0 text-emerald-600 dark:text-emerald-400"
                  />

                  <span className="min-w-0 truncate font-medium text-zinc-700 dark:text-zinc-200">
                    {resolved?.courseName || "Course not resolved"}
                  </span>

                  {resolved?.isResolvedByAdmission && (
                    <span
                      title="Inferred from the admission number"
                      className="inline-flex shrink-0 items-center gap-0.5 rounded-sm bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-400/30 dark:text-amber-300"
                    >
                      <Sparkles size={9} />
                      Inferred
                    </span>
                  )}

                  <span
                    title="Admission number"
                    className="ml-auto shrink-0 rounded-sm bg-[#0B1E3D]/5 px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#0B1E3D] ring-1 ring-inset ring-[#0B1E3D]/10 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/25"
                  >
                    {course.admissionNumber || "N/A"}
                  </span>
                </div>
              );
            })}

            {hiddenCount > 0 && (
              <p className="pl-6 text-xs font-medium text-orange-600 dark:text-orange-400">
                +{hiddenCount} more {hiddenCount === 1 ? "course" : "courses"}
              </p>
            )}
          </>
        )}
      </div>
    </button>
  );
}