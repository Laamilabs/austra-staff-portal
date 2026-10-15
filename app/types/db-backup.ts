import api from "@/app/lib/api";

export const DATABASE_BACKUP_PROMPT_KEY = "austra:show-db-backup-prompt";

export async function downloadDatabaseBackup(): Promise<void> {
  try {
    const response = await api.get<Blob>("/admin/database-backup", {
      responseType: "blob",
    });

    const disposition = response.headers["content-disposition"] as string | undefined;
    const filenameMatch = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    const filename = filenameMatch?.[1]
      ? decodeURIComponent(filenameMatch[1].replace(/"/g, "").trim())
      : "database-backup.zip";

    const objectUrl = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (err: any) {
    // If the error body is a Blob, read it as text so we can see the real message
    const data = err?.response?.data;
    if (data instanceof Blob) {
      const text = await data.text();
      let parsed: any = text;
      try { parsed = JSON.parse(text); } catch {}
      console.error("Backup failed:", err?.response?.status, parsed);
      throw new Error(
        typeof parsed === "string"
          ? parsed
          : parsed?.message ?? parsed?.detail ?? "Backup failed",
      );
    }
    throw err;
  }
}