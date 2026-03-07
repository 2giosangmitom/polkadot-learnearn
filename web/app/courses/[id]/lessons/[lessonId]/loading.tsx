import { Skeleton } from "@/components/ui/skeleton";

export default function LessonLoading() {
  return (
    <div className="flex h-full">
      {/* Sidebar skeleton */}
      <div className="hidden w-80 shrink-0 border-r border-border/50 bg-card p-4 lg:block">
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="mb-2 h-5 w-3/4" />
        <Skeleton className="mb-6 h-1.5 w-full rounded-full" />
        <Skeleton className="mb-3 h-3 w-24" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2.5">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Content skeleton */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar skeleton */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border/50 px-4 py-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-px" />
          <Skeleton className="h-4 w-48" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
        {/* Full-width video skeleton */}
        <Skeleton className="aspect-video w-full shrink-0" />
        {/* Title + quiz below video */}
        <div className="flex-1 p-6">
          <div className="mx-auto max-w-4xl space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
