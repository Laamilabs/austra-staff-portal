// app/(portal)/students/new/components/SelectBloodGroup.tsx
"use client";

import { useId } from "react";

export const BLOOD_GROUPS = [
  "Unknown",
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

export type BloodGroup = (typeof BLOOD_GROUPS)[number];

interface SelectBloodGroupProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function SelectBloodGroup({
  value,
  onChange,
  disabled = false,
  className,
  id,
}: SelectBloodGroupProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <select
      id={selectId}
      className={className}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {BLOOD_GROUPS.map((bg) => (
        <option key={bg} value={bg}>
          {bg}
        </option>
      ))}
    </select>
  );
}