"use client";

import { ReactNode, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual variant — controls the confirm button color. */
  tone?: "danger" | "primary";
  /** Disables the confirm button and shows a spinner. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Close on Escape, and lock body scroll while open.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
      : "bg-[#082B66] text-white hover:bg-[#082B66]/90 focus-visible:ring-[#082B66] dark:bg-orange-400 dark:text-zinc-900 dark:hover:bg-orange-400/90 dark:focus-visible:ring-orange-400";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
        onClick={() => !busy && onCancel()}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-sm border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start gap-3 px-5 pt-5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              tone === "danger"
                ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                : "bg-[#082B66]/10 text-[#082B66] dark:bg-orange-400/10 dark:text-orange-400"
            }`}
          >
            <AlertTriangle size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <h2
              id="confirm-title"
              className="text-base font-semibold text-zinc-900 dark:text-white"
            >
              {title}
            </h2>

            {description && (
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {description}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => !busy && onCancel()}
            className="rounded-sm p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            disabled={busy}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-sm border border-zinc-200 px-4 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex h-9 items-center gap-2 rounded-sm px-4 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-zinc-900 ${confirmClass}`}
          >
            {busy && (
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}