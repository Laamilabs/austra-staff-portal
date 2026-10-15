import { Course } from "@/app/types/courses";
import { unitApi } from "@/app/types/units";

/**
 * Generates an automatic unit code based on selected course code and current unit count.
 * Example: Course Code "CISA", 5 existing units -> "CISA006"
 */
export async function generateUnitCode(selectedCourse: Course): Promise<string> {
  const courseCodePrefix = selectedCourse.courseCode.trim().toUpperCase();

  try {
    const response = await unitApi.getByCourse(selectedCourse._id);
    const existingUnits = response.data || [];
    const nextNumber = existingUnits.length + 1;

    // Pad number to 3 digits (e.g. 1 -> "001", 6 -> "006")
    const formattedNumber = String(nextNumber).padStart(3, "0");

    return `${courseCodePrefix}${formattedNumber}`;
  } catch (error) {
    console.error("Error generating unit code:", error);
    throw new Error("Failed to fetch existing units to auto-generate unit code.");
  }
}