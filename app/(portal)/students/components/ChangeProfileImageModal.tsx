"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Camera, Loader2, X } from "lucide-react";

import { CloudinaryUpload } from "@/app/components/ui/cloudinary";

interface ChangeProfileImageModalProps {
  /** Controls visibility. */
  open: boolean;
  /** Called when the user closes the modal (backdrop, X, or Cancel). */
  onClose: () => void;
  /** Current saved image URL (used to prefill and to detect no-op saves). */
  currentImageUrl?: string | null;
  /** Fallback initials shown when no image is present. */
  initials?: string;
  /** Optional display name shown in the modal subtitle. */
  targetName?: string;
  /** Heading. Defaults to "Change Profile Image". */
  title?: string;
  /**
   * Called with the new image URL when the user clicks Save.
   * Return a Promise to keep the modal open + show a spinner until it
   * resolves. Reject to surface an inline error without closing.
   */
  onSave: (imageUrl: string) => Promise<void> | void;
  /** Cloudinary preset to use. Defaults to "photos". */
  preset?: string;
}

export default function ChangeProfileImageModal({
  open,
  onClose,
  currentImageUrl,
  initials = "?",
  targetName,
  title = "Change Profile Image",
  onSave,
  preset = "photos",
}: ChangeProfileImageModalProps) {
  const [newImageUrl, setNewImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewBroken, setPreviewBroken] = useState(false);

  // Reset transient state on each open, prefill with the current image.
  useEffect(() => {
    if (!open) return;

    setNewImageUrl(currentImageUrl || "");
    setSaveError(null);
    setPreviewBroken(false);
  }, [open, currentImageUrl]);

  const handleSave = useCallback(async () => {
    const trimmed = newImageUrl.trim();

    if (!trimmed) {
      setSaveError("Please upload an image first.");
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      await onSave(trimmed);

      // Parent resolved successfully — close.
      onClose();
    } catch (err: any) {
      console.error("Failed to update profile image:", err);

      const msg =
        err?.response?.data?.message ||
        "Failed to update profile image. Please try again.";

      setSaveError(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setSaving(false);
    }
  }, [newImageUrl, onSave, onClose]);

  if (!open) return null;

  const trimmed = newImageUrl.trim();
  const hasChanged = trimmed !== (currentImageUrl || "").trim();
  const canSave = Boolean(trimmed) && hasChanged && !saving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-[#0B1E3D] dark:text-white">
              {title}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {targetName ? (
                <>
                  Upload a new profile image for{" "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-200">
                    {targetName}
                  </span>
                  .
                </>
              ) : (
                "Upload a new profile image."
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-sm p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-6">
          {/* Preview */}
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-sm border-2 border-orange-400 bg-zinc-800">
              {newImageUrl && !previewBroken ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={newImageUrl}
                  alt="Profile preview"
                  className="h-full w-full object-cover"
                  onError={() => setPreviewBroken(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-bold text-orange-400">
                  {initials}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Preview
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {!newImageUrl
                  ? "Upload an image below to get started."
                  : previewBroken
                  ? "This image could not be previewed. Try a different file."
                  : hasChanged
                  ? "A new image is ready to be saved."
                  : "This is the current profile image."}
              </p>
            </div>
          </div>

          {/* Cloudinary upload */}
          <CloudinaryUpload
            value={newImageUrl}
            onChange={(url) => {
              setNewImageUrl(url || "");
              setSaveError(null);
              setPreviewBroken(false);
            }}
            preset={preset}
            label="Profile Image"
            disabled={saving}
          />

          {/* Error */}
          {saveError && (
            <div className="flex items-start gap-2 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50/60 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-sm border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex items-center gap-2 rounded-sm bg-[#0B1E3D] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#10294d] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
          >
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Camera size={13} />
                Save Image
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}