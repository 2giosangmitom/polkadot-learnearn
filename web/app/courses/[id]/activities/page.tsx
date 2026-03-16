"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  coursesApi,
  activitiesApi,
  type Course,
  type ActivityItem,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurFade } from "@/components/ui/blur-fade";
import { TransactionHash } from "@/components/ui/transaction-hash";
import { ArrowLeft, Coins, TrendingUp, History, User } from "lucide-react";
import { toast } from "sonner";

export default function CourseActivitiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const user = useAuthStore((s) => s.user);
  const [course, setCourse] = useState<Course | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const [c, actList] = await Promise.all([
          coursesApi.get(id),
          activitiesApi.list(id),
        ]);
        setCourse(c);
        setActivities(actList.activities);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load activities.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, user]);

  if (!user && !loading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Please log in to view activities.</p>
        <Link href="/onboarding">
          <Button>Go to Login</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Skeleton className="mb-4 h-10 w-2/3" />
        <Skeleton className="mb-8 h-6 w-full" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h2 className="text-xl font-bold">Course not found</h2>
        <Link href="/courses">
          <Button variant="link" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to courses
          </Button>
        </Link>
      </div>
    );
  }

  const isTeacher = user?.id === course.author_id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <BlurFade delay={0.05}>
        <Link
          href={`/courses/${id}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Course
        </Link>
      </BlurFade>

      <BlurFade delay={0.1}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            {isTeacher ? "Course Sales & Payouts" : "My Activity"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isTeacher
              ? `Track all purchases and payouts for "${course.title}".`
              : `View your purchase and rewards history for "${course.title}".`}
          </p>
        </div>
      </BlurFade>

      <div className="space-y-4">
        {activities.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mb-4 opacity-20" />
              <p>No activity found for this course.</p>
            </CardContent>
          </Card>
        ) : (
          activities.map((item, i) => (
            <BlurFade key={item.id} delay={0.15 + i * 0.05}>
              <Card className="overflow-hidden transition-all hover:bg-muted/50 group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        item.type === "purchase"
                          ? "bg-blue-500/10 text-blue-500"
                          : item.type === "payback"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-purple-500/10 text-purple-500"
                      }`}
                    >
                      {item.type === "purchase" && <Coins className="h-5 w-5" />}
                      {item.type === "payback" && (
                        <TrendingUp className="h-5 w-5" />
                      )}
                      {item.type === "teacher_payout" && (
                        <Coins className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-base">
                          {item.description}
                        </h3>
                        <Badge
                          variant={
                            item.type === "purchase" ? "secondary" : "outline"
                          }
                          className="capitalize text-[10px] h-5 px-1.5"
                        >
                          {item.type.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-medium ${
                              item.type === "purchase"
                                ? "text-red-500 dark:text-red-400"
                                : "text-green-600 dark:text-green-400"
                            }`}
                          >
                            {item.type === "purchase" ? "-" : "+"}
                            {item.amount} PAS
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                          {isTeacher && item.type === "purchase" && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-xs">
                                    <User className="h-3 w-3" />
                                    User {item.user_id.slice(0, 8)}...
                                </span>
                              </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:min-w-50">
                    <TransactionHash
                      hash={item.transaction_hash}
                      status={item.status}
                      showStatus
                      subscanLink={item.subscan_link}
                    />
                  </div>
                </div>
              </Card>
            </BlurFade>
          ))
        )}
      </div>
    </div>
  );
}
