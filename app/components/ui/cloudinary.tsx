"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import {
  Upload,
  X,
  Loader2,
  FileText,
  Link as LinkIcon,
  Copy,
  Check,
  Eye,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { PresetType, uploadToCloudinary } from "@/app/lib/cloudinary";

interface CloudinaryUploadProps {
  value: string;
  onChange: (url: string) => void;
  preset?: PresetType;
  label?: string;
  disabled?: boolean;
  maxFileSizeMb?: number; // Custom max file size check (default 10MB)
}

export function CloudinaryUpload({
  value,
  onChange,
  preset = "photos",
  label = "Upload File",
  disabled = false,
  maxFileSizeMb = 10,
}: CloudinaryUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [fileDetails, setFileDetails] = useState<{ name?: string; size?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDocumentPreset = preset === "documents";

  // Helper to format bytes to KB/MB
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Helper to validate selected file
  const validateFile = (file: File): boolean => {
    setError(null);
    const maxBytes = maxFileSizeMb * 1024 * 1024;

    if (file.size > maxBytes) {
      setError(`File size exceeds limit of ${maxFileSizeMb}MB.`);
      return false;
    }

    if (!isDocumentPreset && !file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WEBP, etc.).");
      return false;
    }

    return true;
  };

  const processFile = async (file: File) => {
    if (!validateFile(file)) return;

    setUploading(true);
    setProgress(20);
    setFileDetails({ name: file.name, size: formatBytes(file.size) });

    // Fake progress interval for better UX feedback during standard upload fetch
    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 200);

    try {
      const secureUrl = await uploadToCloudinary({ file, preset });
      setProgress(100);
      onChange(secureUrl);
    } catch (err: any) {
      setError(err.message || "An error occurred during file upload.");
      setFileDetails(null);
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleClear = () => {
    onChange("");
    setError(null);
    setFileDetails(null);
  };

  const copyToClipboard = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isImageFile = (url: string) => {
    return url.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) || !isDocumentPreset;
  };

  return (
    <div className="w-full space-y-2 font-sans">
      {/* Header Label and Toggle */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label} <span className="text-xs text-zinc-400">(Optional)</span>
        </label>
        <button
          type="button"
          onClick={() => {
            setShowUrlInput(!showUrlInput);
            setError(null);
          }}
          className="text-xs font-medium text-[#082B66] hover:underline dark:text-orange-400"
        >
          {showUrlInput ? "Upload File Instead" : "Enter URL Directly"}
        </button>
      </div>

      {showUrlInput ? (
        /* Manual URL Entry Input */
        <div className="relative w-full">
          <input
            type="url"
            value={value}
            onChange={(e) => {
              setError(null);
              onChange(e.target.value);
            }}
            placeholder="https://res.cloudinary.com/..."
            disabled={disabled}
            className="w-full rounded-md border border-zinc-200 bg-white px-3.5 py-2.5 pl-9 pr-10 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
          />
          <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-2.5 rounded-md p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        /* File Upload & Dropzone Area */
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={
              isDocumentPreset
                ? "image/*,.pdf,.doc,.docx,.xls,.xlsx"
                : "image/*"
            }
            onChange={handleFileChange}
            disabled={disabled || uploading}
            className="hidden"
            id="cloudinary-file-input"
          />

          {!value ? (
            <label
              htmlFor="cloudinary-file-input"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex min-h-30 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-4 transition-all duration-200 ${
                isDragging
                  ? "border-[#082B66] bg-[#082B66]/5 dark:border-orange-400 dark:bg-orange-400/10"
                  : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 hover:bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/50"
              } ${uploading || disabled ? "pointer-events-none opacity-60" : ""}`}
            >
              {uploading ? (
                <div className="w-full max-w-xs space-y-2 text-center">
                  <div className="flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-300">
                    <Loader2 className="h-5 w-5 animate-spin text-[#082B66] dark:text-orange-400" />
                    <span className="text-xs font-medium">Uploading file...</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div
                      className="h-full bg-[#082B66] transition-all duration-300 dark:bg-orange-400"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <div
                    className={`rounded-full p-2.5 transition-transform ${
                      isDragging ? "scale-110 bg-[#082B66]/10 text-[#082B66] dark:bg-orange-400/20 dark:text-orange-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="font-semibold text-[#082B66] dark:text-orange-400">
                      Click to upload
                    </span>{" "}
                    or drag & drop
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {isDocumentPreset
                      ? `PDF, DOC, XLS, images up to ${maxFileSizeMb}MB`
                      : `PNG, JPG, WEBP, GIF up to ${maxFileSizeMb}MB`}
                  </p>
                </div>
              )}
            </label>
          ) : (
            /* Uploaded Preview & Actions Card */
            <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50/80 p-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3 overflow-hidden">
                {/* Thumbnail / Icon */}
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                  {isImageFile(value) ? (
                    <img
                      src={value}
                      alt="Uploaded preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : value.endsWith(".xls") || value.endsWith(".xlsx") ? (
                    <FileSpreadsheet className="h-6 w-6 text-green-600" />
                  ) : (
                    <FileText className="h-6 w-6 text-[#082B66] dark:text-orange-400" />
                  )}
                </div>

                {/* File Details */}
                <div className="truncate text-left">
                  <p className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {fileDetails?.name || "Uploaded File"}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {fileDetails?.size && <span>{fileDetails.size}</span>}
                    <a
                      href={value}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-[#082B66] hover:underline dark:text-orange-400"
                    >
                      View Link
                    </a>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                {/* Image Lightbox Trigger */}
                {isImageFile(value) && (
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(true)}
                    className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    title="Preview Image"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}

                {/* Copy URL Button */}
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  title="Copy Direct URL"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>

                {/* Remove File Button */}
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={disabled}
                  className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {isPreviewOpen && isImageFile(value) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-white p-2 shadow-2xl dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={value}
              alt="Full Preview"
              className="max-h-[80vh] w-auto max-w-full rounded-md object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}