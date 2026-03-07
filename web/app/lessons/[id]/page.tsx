"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { lessonsApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Legacy route: /lessons/[id]
 * Redirects to the new nested route: /courses/[courseId]/lessons/[lessonId]
 */
export default function LegacyLessonRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    lessonsApi.get(id).then((lesson) => {
      router.replace(`/courses/${lesson.course_id}/lessons/${lesson.id}`);
    }).catch(() => {
      router.replace("/courses");
    });
  }, [id, router]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="text-center space-y-4">
        <Skeleton className="mx-auto h-8 w-48" />
        <p className="text-sm text-muted-foreground">Redirecting to lesson...</p>
      </div>
    </div>
  );
}
