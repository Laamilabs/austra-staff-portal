// app/(portal)/students/new/_steps/DetailsSteps.tsx
"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import {
    AddressDetailForm,
    FormState,
    Gender,
    MaritalStatus,
    Update,
    errorClass,
    helpClass,
    inputClass,
    labelClass,
    sectionTitleClass,
} from "../_types";
import { DatePicker } from "../components/DatePicker";
import { SelectBloodGroup } from "../components/selectBloodGoup";
import { SelectCounty } from "../components/selectCounty";

// ============================================================================
// Shared field primitives
// ============================================================================

/** Label + control slot + hint + error. Use directly for selects / pickers. */
function Field({
    label,
    required,
    optional,
    error,
    hint,
    className,
    children,
}: {
    label: string;
    required?: boolean;
    optional?: boolean;
    error?: string;
    hint?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={className}>
            <label className={labelClass}>
                {label}
                {required && <span className="text-red-500"> *</span>}
                {optional && (
                    <span className="font-normal normal-case text-zinc-500 dark:text-zinc-400">
                        {" "}
                        (optional)
                    </span>
                )}
            </label>
            {children}
            {hint && !error && <p className={helpClass + " mt-1.5"}>{hint}</p>}
            {error && <p className={errorClass}>{error}</p>}
        </div>
    );
}

/** Field + a styled text input. */
function TextField({
    label,
    required,
    optional,
    error,
    hint,
    className,
    ...input
}: {
    label: string;
    required?: boolean;
    optional?: boolean;
    error?: string;
    hint?: string;
    className?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
    return (
        <Field
            label={label}
            required={required}
            optional={optional}
            error={error}
            hint={hint}
            className={className}
        >
            <input className={inputClass} aria-invalid={!!error} {...input} />
        </Field>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="space-y-5">
            <h3 className={sectionTitleClass}>{title}</h3>
            {children}
        </section>
    );
}

// ============================================================================
// Personal
// ============================================================================

export function PersonalStep({
    form,
    errors,
    update,
}: {
    form: FormState;
    errors: Record<string, string>;
    update: Update;
}) {
    return (
        <div className="space-y-10">
            <Section title="Name">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <TextField
                        label="First name"
                        required
                        value={form.firstName}
                        onChange={(e) => update("firstName", e.target.value)}
                        error={errors.firstName}
                    />
                    <TextField
                        label="Middle name"
                        optional
                        value={form.middleName}
                        onChange={(e) => update("middleName", e.target.value)}
                        error={errors.middleName}
                    />
                    <TextField
                        label="Last name"
                        required
                        value={form.lastName}
                        onChange={(e) => update("lastName", e.target.value)}
                        error={errors.lastName}
                    />
                </div>
            </Section>

            <Section title="About">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="Gender">
                        <select
                            className={inputClass}
                            value={form.gender}
                            onChange={(e) => update("gender", e.target.value as Gender)}
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </Field>

                    <Field label="Date of birth" required error={errors.dateOfBirth}>
                        <DatePicker
                            value={form.dateOfBirth}
                            onChange={(value) => update("dateOfBirth", value)}
                            placeholder="Select date of birth"
                            disableFuture
                        />
                    </Field>

                    <TextField
                        label="Nationality"
                        required
                        value={form.nationality}
                        onChange={(e) => update("nationality", e.target.value)}
                        error={errors.nationality}
                    />

                    <Field label="Marital status">
                        <select
                            className={inputClass}
                            value={form.maritalStatus}
                            onChange={(e) =>
                                update("maritalStatus", e.target.value as MaritalStatus)
                            }
                        >
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                        </select>
                    </Field>
                </div>
            </Section>

            <Section title="Background">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <TextField
                        label="Occupation"
                        required
                        value={form.occupation}
                        onChange={(e) => update("occupation", e.target.value)}
                        error={errors.occupation}
                    />
                    <TextField
                        label="Physical disability"
                        required
                        value={form.physicalDisability}
                        onChange={(e) => update("physicalDisability", e.target.value)}
                        placeholder="Enter 'None' if not applicable"
                        error={errors.physicalDisability}
                    />
                    <TextField
                        label="Religion"
                        optional
                        value={form.religion}
                        onChange={(e) => update("religion", e.target.value)}
                    />
                </div>
            </Section>
        </div>
    );
}

// ============================================================================
// Contact & Address  ← uses SelectCounty for both address blocks
// ============================================================================

function AddressBlock({
    scope,
    title,
    form,
    errors,
    updateAddress,
    disabled = false,
}: {
    scope: "permanent" | "present";
    title: string;
    form: FormState;
    errors: Record<string, string>;
    updateAddress: (
        scope: "permanent" | "present",
        key: keyof AddressDetailForm,
        value: string,
    ) => void;
    disabled?: boolean;
}) {
    return (
        <div className="rounded-sm border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex items-center gap-3">
                <span
                    className="h-4 w-1 rounded-sm bg-blue-950 dark:bg-orange-400"
                    aria-hidden="true"
                />
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {title}
                </h4>
                {disabled && (
                    <span className="ml-auto rounded-sm bg-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        Same as permanent
                    </span>
                )}
            </div>

            <fieldset
                disabled={disabled}
                className="grid grid-cols-1 gap-5 transition-opacity sm:grid-cols-2 disabled:opacity-50"
            >
                <TextField
                    className="sm:col-span-2"
                    label="Locality"
                    required
                    value={form[scope].address}
                    onChange={(e) => updateAddress(scope, "address", e.target.value)}
                    error={errors[`${scope}.address`]}
                />

                <TextField
                    label="Constituency"
                    required
                    value={form[scope].constituency}
                    onChange={(e) => updateAddress(scope, "constituency", e.target.value)}
                    error={errors[`${scope}.constituency`]}
                />

                {/* County — selects from Kenyan counties and autofills postal code */}
                <Field label="County" required error={errors[`${scope}.county`]}>
                    <SelectCounty
                        className={inputClass}
                        value={form[scope].county}
                        disabled={disabled}
                        onChange={(county, postalCode) => {
                            updateAddress(scope, "county", county);
                            updateAddress(scope, "postalCode", postalCode);
                        }}
                    />
                </Field>

                {/* Postal code — autofilled, still editable */}
                <TextField
                    label="Postal code"
                    required
                    value={form[scope].postalCode}
                    onChange={(e) => updateAddress(scope, "postalCode", e.target.value)}
                    placeholder="Autofilled from county"
                    error={errors[`${scope}.postalCode`]}
                />
            </fieldset>
        </div>
    );
}

export function ContactStep({
    form,
    errors,
    update,
    updateAddress,
}: {
    form: FormState;
    errors: Record<string, string>;
    update: Update;
    updateAddress: (
        scope: "permanent" | "present",
        key: keyof AddressDetailForm,
        value: string,
    ) => void;
}) {
    return (
        <div className="space-y-10">
            <Section title="Contact">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <TextField
                        type="email"
                        label="Contact email"
                        required
                        value={form.contactEmail}
                        onChange={(e) => update("contactEmail", e.target.value)}
                        error={errors.contactEmail}
                    />
                    <TextField
                        type="tel"
                        label="Phone number"
                        required
                        value={form.phoneNumber}
                        onChange={(e) => update("phoneNumber", e.target.value)}
                        error={errors.phoneNumber}
                    />
                </div>
            </Section>

            <Section title="Addresses">
                <AddressBlock
                    scope="permanent"
                    title="Permanent address"
                    form={form}
                    errors={errors}
                    updateAddress={updateAddress}
                />

                <label className="flex cursor-pointer items-center gap-3 rounded-sm border border-zinc-200 px-4 py-3 text-sm text-zinc-800 transition-colors hover:border-orange-400 dark:border-zinc-800 dark:text-zinc-200 dark:hover:border-orange-400">
                    <input
                        type="checkbox"
                        checked={form.sameAddress}
                        onChange={(e) => update("sameAddress", e.target.checked)}
                        className="h-4 w-4 rounded-sm accent-blue-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:accent-orange-400"
                    />
                    Present address is the same as permanent address
                </label>

                <AddressBlock
                    scope="present"
                    title="Present address"
                    form={form}
                    errors={errors}
                    updateAddress={updateAddress}
                    disabled={form.sameAddress}
                />
            </Section>
        </div>
    );
}

// ============================================================================
// Identification
// ============================================================================

export function IdentificationStep({
    form,
    errors,
    update,
}: {
    form: FormState;
    errors: Record<string, string>;
    update: Update;
}) {
    return (
        <div className="space-y-10">
            <Section title="Identity documents">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <TextField
                        label="ID number"
                        required
                        value={form.idNumber}
                        onChange={(e) => update("idNumber", e.target.value)}
                        error={errors.idNumber}
                    />
                    <TextField
                        label="Passport number"
                        optional
                        value={form.passportNumber}
                        onChange={(e) => update("passportNumber", e.target.value)}
                        hint="Leave blank if the student has no passport."
                    />
                </div>
            </Section>

            <Section title="Medical">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field
                        label="Blood group"
                        hint="Leave as “Unknown” if the student doesn’t know their blood group."
                    >
                        <SelectBloodGroup
                            className={inputClass}
                            value={form.bloodGroup}
                            onChange={(value) => update("bloodGroup", value)}
                        />
                    </Field>
                </div>
            </Section>
        </div>
    );
}