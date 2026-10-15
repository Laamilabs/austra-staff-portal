/**
 * Format a date string safely for display.
 * Returns an em-dash for missing or invalid values.
 */
export function formatDate(value?: string): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}