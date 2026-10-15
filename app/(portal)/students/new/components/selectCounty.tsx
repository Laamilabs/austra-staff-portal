// app/(portal)/students/new/components/SelectCounty.tsx
"use client";

import { useId } from "react";

/**
 * Kenyan counties with the postal code of their headquarters
 * (the code most commonly used on official forms).
 */
export interface CountyOption {
  name: string;
  postalCode: string;
}

export const KENYAN_COUNTIES: CountyOption[] = [
  { name: "Baringo",        postalCode: "30400" },
  { name: "Bomet",          postalCode: "20400" },
  { name: "Bungoma",        postalCode: "50200" },
  { name: "Busia",          postalCode: "50400" },
  { name: "Elgeyo Marakwet", postalCode: "30700" },
  { name: "Embu",           postalCode: "60100" },
  { name: "Garissa",        postalCode: "70100" },
  { name: "Homa Bay",       postalCode: "40300" },
  { name: "Isiolo",         postalCode: "60300" },
  { name: "Kajiado",        postalCode: "00206" },
  { name: "Kakamega",       postalCode: "50100" },
  { name: "Kericho",        postalCode: "20200" },
  { name: "Kiambu",         postalCode: "00900" },
  { name: "Kilifi",         postalCode: "80108" },
  { name: "Kirinyaga",      postalCode: "10300" },
  { name: "Kisii",          postalCode: "40200" },
  { name: "Kisumu",         postalCode: "40100" },
  { name: "Kitui",          postalCode: "90200" },
  { name: "Kwale",          postalCode: "80400" },
  { name: "Laikipia",       postalCode: "20300" },
  { name: "Lamu",           postalCode: "80500" },
  { name: "Machakos",       postalCode: "90100" },
  { name: "Makueni",        postalCode: "90300" },
  { name: "Mandera",        postalCode: "70300" },
  { name: "Marsabit",       postalCode: "60500" },
  { name: "Meru",           postalCode: "60200" },
  { name: "Migori",         postalCode: "40400" },
  { name: "Mombasa",        postalCode: "80100" },
  { name: "Murang'a",       postalCode: "10200" },
  { name: "Nairobi",        postalCode: "00100" },
  { name: "Nakuru",         postalCode: "20100" },
  { name: "Nandi",          postalCode: "30300" },
  { name: "Narok",          postalCode: "20500" },
  { name: "Nyamira",        postalCode: "40500" },
  { name: "Nyandarua",      postalCode: "20306" },
  { name: "Nyeri",          postalCode: "10100" },
  { name: "Samburu",        postalCode: "20600" },
  { name: "Siaya",          postalCode: "40600" },
  { name: "Taita Taveta",   postalCode: "80300" },
  { name: "Tana River",     postalCode: "70101" },
  { name: "Tharaka Nithi",  postalCode: "60400" },
  { name: "Trans Nzoia",    postalCode: "30200" },
  { name: "Turkana",        postalCode: "30500" },
  { name: "Uasin Gishu",    postalCode: "30100" },
  { name: "Vihiga",         postalCode: "50300" },
  { name: "Wajir",          postalCode: "70200" },
  { name: "West Pokot",     postalCode: "30600" },
];

/** Convenience lookup — useful when only the code is needed. */
export function getPostalCodeForCounty(county: string): string {
  return (
    KENYAN_COUNTIES.find((c) => c.name === county)?.postalCode ?? ""
  );
}

interface SelectCountyProps {
  value: string;
  /**
   * Fires with both the county name and its default postal code so callers
   * can update two form fields with one action.
   */
  onChange: (county: string, postalCode: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function SelectCounty({
  value,
  onChange,
  disabled = false,
  className,
  id,
}: SelectCountyProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <select
      id={selectId}
      className={className}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const selected = e.target.value;
        const code = getPostalCodeForCounty(selected);
        onChange(selected, code);
      }}
    >
      <option value="">— Select county —</option>
      {KENYAN_COUNTIES.map((c) => (
        <option key={c.name} value={c.name}>
          {c.name} ({c.postalCode})
        </option>
      ))}
    </select>
  );
}