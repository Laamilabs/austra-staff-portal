// app/(portal)/students/new/_steps/AccountStep.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  FormState,
  Update,
  btnSecondary,
  errorClass,
  inputClass,
  labelClass,
  sectionTitleClass,
} from "../_types";

const DEFAULT_STUDENT_PASSWORD = "austra student";

type EmailStatus = "idle" | "checking" | "available" | "taken" | "error";

function splitFullName(full: string): {
  firstName: string;
  middleName: string;
  lastName: string;
} {
  const parts = full.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return { firstName: "", middleName: "", lastName: "" };
  if (parts.length === 1)
    return { firstName: parts[0], middleName: "", lastName: "" };
  if (parts.length === 2)
    return { firstName: parts[0], middleName: "", lastName: parts[1] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

// ============================================================================
// Small presentational pieces
// ============================================================================

const hintClass = "mt-1.5 text-xs text-zinc-600 dark:text-zinc-400";

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12c1.274-4.057 5.065-7 9.542-7 4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.773 4.773zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function EmailStatusLine({ status }: { status: EmailStatus }) {
  if (status === "idle") return null;

  const map: Record<
    Exclude<EmailStatus, "idle">,
    { text: string; dot: string; color: string }
  > = {
    checking: {
      text: "Checking availability…",
      dot: "bg-zinc-400 animate-pulse dark:bg-zinc-500",
      color: "text-zinc-600 dark:text-zinc-400",
    },
    available: {
      text: "Email is available",
      dot: "bg-green-500",
      color: "text-green-700 dark:text-green-400",
    },
    taken: {
      text: "Email is already in use",
      dot: "bg-red-500",
      color: "text-red-600 dark:text-red-400",
    },
    error: {
      text: "Could not verify email right now",
      dot: "bg-orange-400",
      color: "text-orange-600 dark:text-orange-400",
    },
  };

  const s = map[status];
  return (
    <p
      className={`mt-1.5 flex items-center gap-2 text-xs font-medium ${s.color}`}
      role="status"
    >
      <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.text}
    </p>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  error,
  action,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  error?: string;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className={labelClass}>
          {label} <span className="text-red-500">*</span>
        </label>
        {action}
      </div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          className={`${inputClass} pr-11`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label={
            show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`
          }
        >
          <EyeIcon open={show} />
        </button>
      </div>
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}

// ============================================================================
// Step
// ============================================================================

export function AccountStep({
  form,
  errors,
  update,
  emailStatus,
  onCheckEmail,
}: {
  form: FormState;
  errors: Record<string, string>;
  update: Update;
  emailStatus: EmailStatus;
  onCheckEmail: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  const checkEmailRef = useRef(onCheckEmail);
  useEffect(() => {
    checkEmailRef.current = onCheckEmail;
  }, [onCheckEmail]);

  const updateRef = useRef(update);
  useEffect(() => {
    updateRef.current = update;
  }, [update]);

  // Auto-fill default password once when user creation is enabled
  useEffect(() => {
    if (form.createUser && !form.userPassword && !form.userConfirmPassword) {
      updateRef.current("userPassword", DEFAULT_STUDENT_PASSWORD);
      updateRef.current("userConfirmPassword", DEFAULT_STUDENT_PASSWORD);
    }
  }, [form.createUser]);

  // Debounced email availability check
  useEffect(() => {
    if (!form.createUser || !form.userEmail || emailStatus === "checking")
      return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.userEmail)) return;

    const timer = setTimeout(() => {
      checkEmailRef.current();
    }, 500);

    return () => clearTimeout(timer);
  }, [form.userEmail, form.createUser]);

  const handleFillDefaultPassword = () => {
    update("userPassword", DEFAULT_STUDENT_PASSWORD);
    update("userConfirmPassword", DEFAULT_STUDENT_PASSWORD);
  };

  /**
   * Update the account-level userName AND mirror the split into
   * firstName / middleName / lastName.
   */
  const handleFullNameChange = (value: string) => {
    update("userName", value);

    const parts = value.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return;

    const { firstName, middleName, lastName } = splitFullName(value);
    update("firstName", firstName);
    update("middleName", middleName);
    update("lastName", lastName);
  };

  /**
   * Update the user email AND mirror it into the student contact email.
   * The contact email stays editable in the Contact step.
   */
  const handleEmailChange = (value: string) => {
    update("userEmail", value);
    update("contactEmail", value);
  };

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/* Toggle                                                              */}
      {/* ------------------------------------------------------------------ */}
      <label className="flex cursor-pointer items-start gap-4 rounded-sm border border-zinc-200 bg-zinc-50 p-4 transition-colors hover:border-orange-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-orange-400">
        <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0">
          <input
            type="checkbox"
            checked={form.createUser}
            onChange={(e) => update("createUser", e.target.checked)}
            className="peer sr-only"
          />
          <span className="absolute inset-0 rounded-sm bg-zinc-300 transition-colors peer-checked:bg-blue-950 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-400 peer-focus-visible:ring-offset-2 dark:bg-zinc-700 dark:peer-checked:bg-orange-400 dark:peer-focus-visible:ring-offset-zinc-900" />
          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-sm bg-white shadow transition-transform peer-checked:translate-x-5 dark:peer-checked:bg-zinc-950" />
        </span>
        <span>
          <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Create user account now
          </span>
          <span className="mt-0.5 block text-xs text-zinc-600 dark:text-zinc-400">
            Turn off to create the student record only and assign a user later.
          </span>
        </span>
      </label>

      <fieldset
        disabled={!form.createUser}
        className="space-y-8 transition-opacity disabled:opacity-50"
      >
        {/* ---------------------------------------------------------------- */}
        {/* Identity                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section className="space-y-5">
          <h3 className={sectionTitleClass}>Identity</h3>

          <div>
            <label className={labelClass}>Full official name</label>
            <input
              className={inputClass}
              value={form.userName}
              onChange={(e) => handleFullNameChange(e.target.value)}
              placeholder="e.g. John Paul Ochieng Otieno"
            />
            <p className={hintClass}>
              First, middle and last names are filled in automatically on the
              next step. You can still edit them there.
            </p>
          </div>

          <div>
            <label className={labelClass}>
              Email <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                className={inputClass}
                value={form.userEmail}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={onCheckEmail}
                placeholder="student@example.com"
                aria-invalid={!!errors.userEmail || emailStatus === "taken"}
              />
              <button
                type="button"
                className={`${btnSecondary} shrink-0 px-3!`}
                onClick={onCheckEmail}
                disabled={!form.userEmail || emailStatus === "checking"}
                aria-label="Check email availability"
                title="Check availability"
              >
                {emailStatus === "checking" ? (
                  <Spinner className="h-5 w-5" />
                ) : (
                  <SearchIcon />
                )}
              </button>
            </div>
            <EmailStatusLine status={emailStatus} />
            {errors.userEmail && emailStatus !== "taken" && (
              <p className={errorClass}>{errors.userEmail}</p>
            )}
            <p className={hintClass}>
              Also used as the student contact email. You can change it later in
              the Contact step.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Credentials                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section className="space-y-5">
          <h3 className={sectionTitleClass}>Credentials</h3>

          <div className="grid grid-cols-1 gap-5 rounded-sm border border-zinc-200 p-5 dark:border-zinc-800 sm:grid-cols-2">
            <PasswordField
              label="Password"
              value={form.userPassword}
              onChange={(v) => update("userPassword", v)}
              show={showPassword}
              onToggle={() => setShowPassword((p) => !p)}
              error={errors.userPassword}
              action={
                <button
                  type="button"
                  onClick={handleFillDefaultPassword}
                  className="mb-1.5 text-xs font-medium text-blue-950 underline-offset-2 hover:underline dark:text-orange-400"
                >
                  Reset to default
                </button>
              }
            />

            <PasswordField
              label="Confirm password"
              value={form.userConfirmPassword}
              onChange={(v) => update("userConfirmPassword", v)}
              show={showPassword}
              onToggle={() => setShowPassword((p) => !p)}
              error={errors.userConfirmPassword}
            />

            <p className="text-xs text-zinc-600 dark:text-zinc-400 sm:col-span-2">
              A default password is pre-filled. Keep it for first sign-in or set
              a new one (minimum 6 characters).
            </p>
          </div>
        </section>
      </fieldset>
    </div>
  );
}