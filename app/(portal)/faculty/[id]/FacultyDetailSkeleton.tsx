export default function FacultyDetailSkeleton() {
  return (
    <main className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 h-6 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mb-6 h-36 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <div className="h-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-32 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="h-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    </main>
  );
}