export type PresetType = "documents" | "photos" | "otherphotos" | string;

export interface UploadOptions {
    file: File;
    preset?: PresetType;
    maxSizeBytes?: number;
}

/**
 * Resolves the appropriate Cloudinary upload preset based on the preset type or environment variables.
 */
export function getUploadPreset(preset?: PresetType): string {
    if (preset === "documents") {
        return (
            process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_DOCS || "documents"
        );
    }
    if (preset === "photos") {
        return (
            process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_PROFILE_PHOTOS || "photos"
        );
    }
    if (preset === "otherphotos") {
        return (
            process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_OTHER_PHOTOS || "otherphotos"
        );
    }

    return (
        preset ||
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_OTHER_PHOTOS ||
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
        "photos"
    );
}

/**
 * Validates a file based on preset type and size limits.
 */
export function validateFile(
    file: File,
    isDocumentPreset: boolean,
    maxSizeBytes: number = 10 * 1024 * 1024
): string | null {
    if (!isDocumentPreset && !file.type.startsWith("image/")) {
        return "Please select a valid image file.";
    }

    if (file.size > maxSizeBytes) {
        const sizeInMb = Math.round(maxSizeBytes / (1024 * 1024));
        return `File size should be less than ${sizeInMb}MB.`;
    }

    return null;
}

/**
 * Uploads a file directly to Cloudinary.
 */
export async function uploadToCloudinary({
    file,
    preset = "photos",
    maxSizeBytes = 10 * 1024 * 1024,
}: UploadOptions): Promise<string> {
    const isDocumentPreset = preset === "documents";

    const validationError = validateFile(file, isDocumentPreset, maxSizeBytes);
    if (validationError) {
        throw new Error(validationError);
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const activePreset = getUploadPreset(preset);

    if (!cloudName || !activePreset) {
        throw new Error(
            "Cloudinary configuration missing. Please check your environment variables."
        );
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", activePreset);

    // Non-images (PDF, DOCX, XLSX, etc.) require the 'raw' resource type endpoint
    const resourceType = "auto";

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        {
            method: "POST",
            body: formData,
        }
    );

    const data = await response.json();

    if (!response.ok) {
        // Log exact error returned by Cloudinary API
        console.error("Cloudinary Error Response:", data);
        throw new Error(data.error?.message || "Failed to upload file.");
    }

    return data.secure_url as string;
}