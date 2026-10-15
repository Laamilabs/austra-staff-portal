"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  format,
  parseISO,
  isValid,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isAfter,
  setYear,
  setMonth,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

import { PortalDropdown } from "@/app/components/ui/portal-dropdown";

interface DatePickerProps {
  /** ISO date string (yyyy-MM-dd) or empty string. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Earliest selectable year. Defaults to 100 years ago. */
  fromYear?: number;
  /** Latest selectable year. Defaults to current year. */
  toYear?: number;
  /** Block dates after today. */
  disableFuture?: boolean;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className = "",
  fromYear,
  toYear,
  disableFuture = false,
}: DatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const parsed = value ? parseISO(value) : undefined;
  const selectedDate = parsed && isValid(parsed) ? parsed : undefined;

  const today = new Date();
  const defaultFromYear = fromYear ?? today.getFullYear() - 100;
  const defaultToYear = toYear ?? today.getFullYear();

  // Active view date state (for month/year browsing)
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate || today);

  // Sync viewed month when selection changes externally
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate);
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inTrigger = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inTrigger && !inDropdown) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calendar matrix calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handleSelect = (day: Date) => {
    onChange(format(day, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const years = Array.from(
    { length: defaultToYear - defaultFromYear + 1 },
    (_, i) => defaultToYear - i
  );

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <div
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full px-3 py-2 border rounded-sm text-sm flex items-center justify-between cursor-pointer transition-all duration-150 select-none shadow-xs ${disabled
          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-800"
          : isOpen
            ? "border-orange-400 ring-2 ring-orange-400/20 bg-white dark:bg-slate-900 dark:border-orange-400"
            : "border-slate-300 bg-white text-slate-800 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600"
          }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
          <CalendarIcon
            className={`w-4 h-4 shrink-0 transition-colors ${isOpen ? "text-orange-400" : "text-slate-500 dark:text-slate-400"
              }`}
          />
          {selectedDate ? (
            <span className="text-slate-900 dark:text-slate-100 font-medium truncate">
              {format(selectedDate, "PPP")}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 truncate">
              {placeholder}
            </span>
          )}
        </div>

        {selectedDate && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 ml-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-sm transition-colors dark:hover:bg-slate-800 dark:text-slate-500 dark:hover:text-slate-300"
            title="Clear date"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Custom Calendar Dropdown */}
      <PortalDropdown
        open={isOpen && !disabled}
        anchorRef={containerRef}
        dropdownRef={dropdownRef}
        maxHeight={420}
      >
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm shadow-xl w-78 min-w-70 max-w-[calc(100vw-2rem)]">  {/* Header Controls */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800 gap-1">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-sm transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={currentMonth.getMonth()}
                onChange={(e) =>
                  setCurrentMonth(setMonth(currentMonth, parseInt(e.target.value)))
                }
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-sm px-1.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400 cursor-pointer"
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={currentMonth.getFullYear()}
                onChange={(e) =>
                  setCurrentMonth(setYear(currentMonth, parseInt(e.target.value)))
                }
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-sm px-1.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-400 cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-sm transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 mb-1 text-center">
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className="text-[0.7rem] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider py-1"
              >
                {day}
              </span>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);
              const isDisabled = disableFuture && isAfter(day, today);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelect(day)}
                  className={`h-8 w-8 rounded-sm text-xs font-medium flex items-center justify-center transition-all ${!isCurrentMonth
                    ? "text-slate-300 dark:text-slate-600"
                    : isSelected
                      ? "bg-slate-900 text-white dark:bg-orange-400 dark:text-slate-950 font-bold shadow-xs"
                      : isTodayDate
                        ? "border border-orange-400 text-orange-600 dark:text-orange-400 font-semibold"
                        : "text-slate-700 dark:text-slate-200 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-400/10 dark:hover:text-orange-400"
                    } ${isDisabled ? "opacity-30 cursor-not-allowed hover:bg-transparent" : "cursor-pointer"}`}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </div>
      </PortalDropdown>
    </div>
  );
}