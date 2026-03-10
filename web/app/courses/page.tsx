"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { coursesApi, usersApi, type Course, type User } from "@/lib/api";
import { MagicCard } from "@/components/ui/magic-card";
import { BlurFade } from "@/components/ui/blur-fade";
import { TextAnimate } from "@/components/ui/text-animate";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Coins, User as UserIcon } from "lucide-react";
import { useTheme } from "next-themes";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [authors, setAuthors] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    async function load() {
      try {
        const courseList = await coursesApi.list();
        setCourses(courseList);

        // Fetch unique authors
        const authorIds = [...new Set(courseList.map((c) => c.author_id))];
        const authorMap: Record<string, User> = {};
        await Promise.allSettled(
          authorIds.map(async (id) => {
            try {
              const users = await usersApi.list();
              const user = users.find((u) => u.id === id);
              if (user) authorMap[id] = user;
            } catch {
              // ignore
            }
          }),
        );
        setAuthors(authorMap);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12">
        <BlurFade delay={0.1}>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <TextAnimate animation="blurInUp" by="word">
              Explore Courses
            </TextAnimate>
          </h1>
        </BlurFade>
        <BlurFade delay={0.2}>
          <p className="mt-3 text-muted-foreground max-w-xl">
            Browse expert-created courses. Purchase access with PAS and start
            learning.
          </p>
        </BlurFade>
        {!loading && (
          <BlurFade delay={0.3}>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <NumberTicker value={courses.length} /> courses available
            </div>
          </BlurFade>
        )}
      </div>

      {/* Course grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold">No courses yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Check back later or create a course as a teacher.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, i) => (
            <BlurFade key={course.id} delay={0.1 + i * 0.05}>
              <Link href={`/courses/${course.id}`}>
                <MagicCard
                  className="h-full cursor-pointer p-0 transition-transform hover:scale-[1.02]"
                  gradientColor={
                    theme === "dark"
                      ? "rgba(230, 0, 122, 0.08)"
                      : "rgba(230, 0, 122, 0.05)"
                  }
                >
                  <div className="flex h-full flex-col p-6">
                    {/* Price badge */}
                    <div className="mb-4 flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className="gap-1.5 bg-primary/10 text-primary hover:bg-primary/15"
                      >
                        <Coins className="h-3 w-3" />
                        {course.price} PAS
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(course.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Title + description */}
                    <h3 className="mb-2 text-lg font-bold leading-tight line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="mb-4 flex-1 text-sm text-muted-foreground line-clamp-3">
                      {course.description}
                    </p>

                    {/* Author */}
                    <div className="flex items-center gap-2 border-t border-border/50 pt-4">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                        <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {authors[course.author_id]?.display_name ?? "Unknown"}
                      </span>
                    </div>
                  </div>
                </MagicCard>
              </Link>
            </BlurFade>
          ))}
        </div>
      )}
    </div>
  );
}
