// app/types/application.ts

import api from "../lib/api";
import type { Course } from "./students";

// ---------------------------------------------------------------------------
// Enums / string unions
// ---------------------------------------------------------------------------

export type ApplicationStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "waitlisted"
  | "withdrawn";

export type StudyMode = "on_campus" | "online" | "hybrid";

export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

// ---------------------------------------------------------------------------
// Populated references
// ---------------------------------------------------------------------------

/**
 * Populated Course reference for applications.
 *
 * Application reads populate:
 *   courseCode, name, level, duration, featured
 *
 * `course` may also be a raw ObjectId string when the application is returned
 * directly from create/update operations that do not call `.populate()`, or
 * null if the referenced Course no longer exists.
 */
export interface ApplicationCourse extends Course {
  featured?: boolean;
}

/**
 * Populated reviewer reference.
 *
 * Only GET /applications/:id populates `reviewedBy` with:
 *   firstName, lastName, email
 */
export interface ApplicationReviewer {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

// ---------------------------------------------------------------------------
// Sub-documents
// ---------------------------------------------------------------------------

export interface ApplicantDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender?: Gender;
  nationality: string;
  locality: string;
  county: string;

  /**
   * Virtual exposed by the backend when `toJSON: { virtuals: true }` is used.
   */
  fullName?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface EducationBackground {
  highestQualification: string;
  institution: string;
  yearCompleted: number;
  gradeOrGpa?: string;
}

// ---------------------------------------------------------------------------
// Application entity
// ---------------------------------------------------------------------------

export interface Application {
  _id: string;

  applicationNumber: string;

  /**
   * Populated Course, raw ObjectId string, or null when the referenced Course
   * no longer exists.
   */
  course: ApplicationCourse | string | null;

  applicant: ApplicantDetails;

  emergencyContact: EmergencyContact;

  education: EducationBackground;

  studyMode: StudyMode;

  preferredStartDate: string;

  personalStatement?: string;

  previousExperience?: string;

  status: ApplicationStatus;

  reviewNotes?: string;

  /**
   * Populated reviewer, raw ObjectId string, or null when the referenced User
   * no longer exists.
   */
  reviewedBy?: ApplicationReviewer | string | null;

  reviewedAt?: string;

  declarationAccepted: boolean;

  declarationAcceptedAt?: string;

  referralSource?: string;

  isInternational: boolean;

  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

// ---------------------------------------------------------------------------
// Create / update DTOs
// ---------------------------------------------------------------------------

export interface CreateApplicantDetailsDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender?: Gender;
  nationality: string;
  locality: string;
  county: string;
}

export interface CreateEmergencyContactDto {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface CreateEducationBackgroundDto {
  highestQualification: string;
  institution: string;
  yearCompleted: number;
  gradeOrGpa?: string;
}

export interface CreateApplicationDto {
  /**
   * MongoDB Course ObjectId.
   */
  course: string;

  applicant: CreateApplicantDetailsDto;

  emergencyContact: CreateEmergencyContactDto;

  education: CreateEducationBackgroundDto;

  studyMode: StudyMode;

  preferredStartDate: string;

  personalStatement?: string;

  previousExperience?: string;

  referralSource?: string;

  isInternational?: boolean;

  declarationAccepted: boolean;
}

export type UpdateApplicationDto = Partial<CreateApplicationDto> & {
  status?: ApplicationStatus;
  reviewNotes?: string;
};

/**
 * PATCH /applications/:id/status
 */
export interface UpdateApplicationStatusDto {
  status: ApplicationStatus;
  reviewNotes?: string;
  reviewedBy?: string;
}

// ---------------------------------------------------------------------------
// Statistics / aggregation types
// ---------------------------------------------------------------------------

/**
 * GET /applications/stats/summary
 */
export interface ApplicationSummaryStats {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  thisMonth: number;
  lastMonth: number;
  /**
   * Month-over-month growth, expressed as a percentage.
   * e.g. 12.5 means +12.5% vs last month.
   */
  growthRate: number;
  international: number;
  /**
   * Percentage of total applications that are approved.
   * e.g. 34.21 means 34.21% of all applications were approved.
   */
  approvedRate: number;
}

/**
 * GET /applications/stats/status
 */
export interface ApplicationStatusStat {
  status: ApplicationStatus;
  count: number;
}

/**
 * GET /applications/stats/study-mode
 */
export interface ApplicationStudyModeStat {
  studyMode: StudyMode;
  count: number;
}

/**
 * GET /applications/stats/course
 */
export interface ApplicationCourseStat {
  courseId: string;
  courseCode?: string;
  courseName?: string;
  level?: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  /**
   * Percentage of this course's applications that were approved.
   */
  approvalRate: number;
}

/**
 * GET /applications/stats/trend
 */
export interface ApplicationTrendPoint {
  /**
   * Bucket label. Format depends on `groupBy`:
   *   - "month" -> "YYYY-MM" (e.g. "2026-04")
   *   - "day"   -> "YYYY-MM-DD" (e.g. "2026-04-17")
   */
  period: string;
  count: number;
  approved: number;
  rejected: number;
}

export type TrendGroupBy = "day" | "month";

export interface ApplicationTrendParams {
  groupBy?: TrendGroupBy;
  /**
   * ISO date string (inclusive lower bound).
   */
  from?: string;
  /**
   * ISO date string (inclusive upper bound).
   */
  to?: string;
}

/**
 * GET /applications/stats/demographics
 */
export interface ApplicationDemographicsStats {
  gender: { gender: Gender | null; count: number }[];
  topCounties: { county: string; count: number }[];
  international: { isInternational: boolean; count: number }[];
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const applicationApi = {
  /**
   * Submit a new course application.
   *
   * POST /applications
   */
  create(data: CreateApplicationDto) {
    return api.post<Application>("/applications", data);
  },

  /**
   * List all applications, optionally filtered by status.
   *
   * GET /applications
   * GET /applications?status=pending
   */
  getAll(status?: ApplicationStatus) {
    return api.get<Application[]>("/applications", {
      params: status ? { status } : undefined,
    });
  },

  // -------------------------------------------------------------------------
  //  Statistics / aggregation
  // -------------------------------------------------------------------------

  /**
   * Dashboard summary: totals, status breakdown, MoM growth, approval rate.
   *
   * GET /applications/stats/summary
   */
  getSummaryStats() {
    return api.get<ApplicationSummaryStats>("/applications/stats/summary");
  },

  /**
   * Applications grouped by status.
   *
   * GET /applications/stats/status
   */
  getStatusStats() {
    return api.get<ApplicationStatusStat[]>("/applications/stats/status");
  },

  /**
   * Applications grouped by study mode.
   *
   * GET /applications/stats/study-mode
   */
  getStudyModeStats() {
    return api.get<ApplicationStudyModeStat[]>(
      "/applications/stats/study-mode",
    );
  },

  /**
   * Applications per course with per-status breakdown + approval rate.
   *
   * GET /applications/stats/course
   */
  getCourseStats() {
    return api.get<ApplicationCourseStat[]>("/applications/stats/course");
  },

  /**
   * Applications over time (day or month buckets).
   *
   * GET /applications/stats/trend?groupBy=month&from=2026-01-01&to=2026-12-31
   */
  getTrendStats(params: ApplicationTrendParams = {}) {
    return api.get<ApplicationTrendPoint[]>("/applications/stats/trend", {
      params,
    });
  },

  /**
   * Applicant demographics: gender split, top counties, international vs local.
   *
   * GET /applications/stats/demographics
   */
  getDemographicsStats() {
    return api.get<ApplicationDemographicsStats>(
      "/applications/stats/demographics",
    );
  },

  // -------------------------------------------------------------------------
  //  Lookups
  // -------------------------------------------------------------------------

  /**
   * Find all applications by applicant email.
   *
   * GET /applications/email/:email
   */
  getByEmail(email: string) {
    return api.get<Application[]>(
      `/applications/email/${encodeURIComponent(email)}`,
    );
  },

  /**
   * Find an application by its human-readable application number.
   *
   * GET /applications/number/:applicationNumber
   */
  getByApplicationNumber(applicationNumber: string) {
    return api.get<Application>(
      `/applications/number/${encodeURIComponent(applicationNumber)}`,
    );
  },

  /**
   * Get a single application by MongoDB _id.
   *
   * GET /applications/:id
   */
  getById(id: string) {
    return api.get<Application>(`/applications/${id}`);
  },

  // -------------------------------------------------------------------------
  //  Mutations
  // -------------------------------------------------------------------------

  /**
   * Partial update of an application.
   *
   * PATCH /applications/:id
   */
  update(id: string, data: UpdateApplicationDto) {
    return api.patch<Application>(`/applications/${id}`, data);
  },

  /**
   * Update only the application status.
   *
   * PATCH /applications/:id/status
   */
  updateStatus(id: string, data: UpdateApplicationStatusDto) {
    return api.patch<Application>(`/applications/${id}/status`, data);
  },

  /**
   * Delete an application.
   *
   * DELETE /applications/:id
   */
  delete(id: string) {
    return api.delete<Application>(`/applications/${id}`);
  },
};