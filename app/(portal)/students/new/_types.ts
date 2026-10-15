// app/(portal)/students/new/_types.ts

export type Gender = "Male" | "Female" | "Other";
export type MaritalStatus = "Single" | "Married" | "Divorced" | "Widowed";

export interface AddressDetailForm {
  address: string;
  constituency: string;
  county: string;
  postalCode: string;
}

export interface CourseEntryForm {
  courseId: string;
  dateOfAdmission: string;
  dateOfCompletion: string;
}

export interface FormState {
  // Step 1 — user account
  createUser: boolean;
  userName: string;
  userEmail: string;
  userPassword: string;
  userConfirmPassword: string;

  // Step 2 — personal details
  firstName: string;
  middleName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  nationality: string;
  maritalStatus: MaritalStatus;
  occupation: string;
  physicalDisability: string;
  religion: string;

  // Step 3 — contact & addresses
  contactEmail: string;
  phoneNumber: string;
  permanent: AddressDetailForm;
  present: AddressDetailForm;
  sameAddress: boolean;

  // Step 4 — identification
  bloodGroup: string;
  idNumber: string;
  passportNumber: string;

  // Step 5 — courses
  courses: CourseEntryForm[];
}

export const emptyAddress: AddressDetailForm = {
  address: "",
  constituency: "",
  county: "",
  postalCode: "",
};

export const emptyCourse: CourseEntryForm = {
  courseId: "",
  dateOfAdmission: "",
  dateOfCompletion: "",
};

export const initialState: FormState = {
  createUser: true,
  userName: "",
  userEmail: "",
  userPassword: "",
  userConfirmPassword: "",

  firstName: "",
  middleName: "",
  lastName: "",
  gender: "Male",
  dateOfBirth: "",
  nationality: "Kenyan",
  maritalStatus: "Single",
  occupation: "Student",
  physicalDisability: "None",
  religion: "",

  contactEmail: "",
  phoneNumber: "",
  permanent: { ...emptyAddress },
  present: { ...emptyAddress },
  sameAddress: false,

  bloodGroup: "Unknown",
  idNumber: "",
  passportNumber: "",

  courses: [{ ...emptyCourse }],
};

export const STEPS = [
  { key: "account", label: "User Account" },
  { key: "personal", label: "Personal Details" },
  { key: "contact", label: "Contact & Address" },
  { key: "identification", label: "Identification" },
  { key: "courses", label: "Course Enrolment" },
  { key: "review", label: "Review & Submit" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

// ============================================================================
// Shared style tokens (Tailwind) — Light & Dark Mode + Orange-400 & Navy Blue
// ============================================================================
export const inputClass =
  "block w-full rounded-sm border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 disabled:bg-zinc-100 disabled:text-zinc-500 aria-invalid:border-red-400 aria-invalid:focus:ring-red-400/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:disabled:bg-zinc-800 dark:aria-invalid:border-red-500";

export const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300";

export const errorClass =
  "mt-1.5 text-xs font-medium text-red-600 dark:text-red-400";

export const sectionTitleClass =
  "flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.15em] text-blue-950 after:h-px after:flex-1 after:bg-zinc-200 dark:text-orange-400 dark:after:bg-zinc-800";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-sm bg-blue-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-orange-400 dark:text-zinc-950 dark:hover:bg-orange-300 dark:focus-visible:ring-offset-zinc-900";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-sm border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export const helpClass =
  "mt-1 text-xs text-zinc-500 dark:text-zinc-400";

// Optional: Navy brand button variant if needed elsewhere in the form
export const btnNavy =
  "inline-flex items-center justify-center rounded-sm bg-blue-950 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-950 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-orange-400 dark:hover:bg-zinc-700";

// ============================================================================
// Shared component prop helper
// ============================================================================

export type Update = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;