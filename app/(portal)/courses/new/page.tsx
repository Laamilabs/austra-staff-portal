import RequireRole from "@/app/components/navigation/RequireRole";
import CourseForm from "./CourseForm";

export default function NewCoursePage() {
  return (
    <RequireRole role="admin">
      <CourseForm />
    </RequireRole>
  );
}