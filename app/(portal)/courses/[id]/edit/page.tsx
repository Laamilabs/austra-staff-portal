import RequireRole from "@/app/components/navigation/RequireRole";
import EditCourseForm from "./EditCourseForm";

export default function EditCoursePage() {
    return (
        <RequireRole
            role="admin"
            loading={
                <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                    <div className="mx-auto max-w-400 px-4 py-8 sm:px-6 lg:px-8">
                        <div className="animate-pulse space-y-6">
                            <div className="h-8 w-48 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                            <div className="h-4 w-72 rounded-sm bg-zinc-200 dark:bg-zinc-800" />

                            <div className="rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                                <div className="space-y-6">
                                    <div className="h-10 rounded-sm bg-zinc-50 dark:bg-zinc-800/60" />
                                    <div className="h-10 rounded-sm bg-zinc-50 dark:bg-zinc-800/60" />
                                    <div className="h-32 rounded-sm bg-zinc-50 dark:bg-zinc-800/60" />
                                    <div className="h-10 rounded-sm bg-zinc-50 dark:bg-zinc-800/60" />
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            }
        >
            <EditCourseForm />
        </RequireRole>
    );
}