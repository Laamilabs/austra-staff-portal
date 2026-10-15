"use client";

import { useMemo, useState } from "react";
import courses from "@/app/types/austra.courses.json";

export interface CourseReference {
  courseCode: string;
  name: string;
}

export interface ResolveCourseResult {
  admissionNumber: string;
  courseCode: string;
  courseName: string;
}

interface ResolveCourseProps {
  initialAdmissionNumber?: string;
  onResolved?: (result: ResolveCourseResult) => void;
}

const courseList = courses as CourseReference[];

/**
 * Extract course code from:
 * ATI/COURSE_CODE/INDEX/YEAR
 *
 * Example:
 * ATI/AD/0004/025 -> AD
 */
export const extractCourseCode = (
  admissionNumber: string,
): string | null => {
  const parts = admissionNumber
    .trim()
    .toUpperCase()
    .split("/");

  if (parts.length !== 4) {
    return null;
  }

  const [prefix, courseCode, index, year] = parts;

  if (prefix !== "ATI") {
    return null;
  }

  if (!courseCode || !index || !year) {
    return null;
  }

  if (!/^\d+$/.test(index)) {
    return null;
  }

  if (!/^\d+$/.test(year)) {
    return null;
  }

  return courseCode;
};

/**
 * Resolve an admission number to a course
 * using austra.courses.json.
 */
export const resolveCourseByAdmissionNumber = (
  admissionNumber: string,
): ResolveCourseResult | null => {
  const value = admissionNumber.trim();

  if (!value) {
    return null;
  }

  const courseCode = extractCourseCode(value);

  if (!courseCode) {
    return null;
  }

  const course = courseList.find(
    (item) =>
      item.courseCode.trim().toUpperCase() === courseCode,
  );

  if (!course) {
    return null;
  }

  return {
    admissionNumber: value.toUpperCase(),
    courseCode: course.courseCode,
    courseName: course.name,
  };
};

export default function ResolveCourse({
  initialAdmissionNumber = "",
  onResolved,
}: ResolveCourseProps) {
  const [admissionNumber, setAdmissionNumber] = useState(
    initialAdmissionNumber,
  );

  const [error, setError] = useState("");
  const [resolved, setResolved] =
    useState<ResolveCourseResult | null>(null);

  const resolveCourse = () => {
    setError("");
    setResolved(null);

    const value = admissionNumber.trim();

    if (!value) {
      setError("Enter an admission number.");
      return;
    }

    const result = resolveCourseByAdmissionNumber(value);

    if (!result) {
      const courseCode = extractCourseCode(value);

      if (!courseCode) {
        setError(
          "Invalid admission number. Expected format: ATI/COURSE_CODE/INDEX/YEAR",
        );
        return;
      }

      setError(
        `No course was found for course code "${courseCode}".`,
      );
      return;
    }

    setResolved(result);
    onResolved?.(result);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      resolveCourse();
    }
  };

  const example = useMemo(
    () => "ATI/AD/0004/025",
    [],
  );

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="admission-number"
          className="mb-2 block text-sm font-medium text-zinc-900 dark:text-white"
        >
          Admission Number
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="admission-number"
            type="text"
            value={admissionNumber}
            onChange={(event) => {
              setAdmissionNumber(
                event.target.value.toUpperCase(),
              );

              if (error) {
                setError("");
              }

              if (resolved) {
                setResolved(null);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={example}
            className="h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm uppercase text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
          />

          <button
            type="button"
            onClick={resolveCourse}
            className="h-10 rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-700 active:bg-blue-800"
          >
            Resolve Course
          </button>
        </div>

        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Format: ATI/COURSE_CODE/INDEX/YEAR
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {resolved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
              ✓
            </div>

            <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              Course Resolved
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Admission Number
              </p>

              <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">
                {resolved.admissionNumber}
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Course Code
              </p>

              <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">
                {resolved.courseCode}
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Course Name
              </p>

              <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">
                {resolved.courseName}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}