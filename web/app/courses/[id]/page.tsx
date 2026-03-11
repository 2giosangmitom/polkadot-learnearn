"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  coursesApi,
  lessonsApi,
  purchasesApi,
  progressApi,
  type Course,
  type Lesson,
  type CourseProgress,
  type LessonProgressSummary,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useAccount, useStatus, useApi, useBalance } from "@luno-kit/react";
import { useSendTransaction } from "@luno-kit/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { BlurFade } from "@/components/ui/blur-fade";
import { DescriptionRenderer } from "@/components/description-renderer";
import { stripHtml } from "@/lib/utils";
import { BorderBeam } from "@/components/ui/border-beam";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  BookOpen,
  Coins,
  Play,
  CheckCircle2,
  Loader2,
  Lock,
  ArrowLeft,
  ShieldCheck,
  Trophy,
  CircleAlert,
} from "lucide-react";
import { toast } from "sonner";

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { address } = useAccount();
  const status = useStatus();
  const { api, isApiReady } = useApi();
  const { data: balance } = useBalance({ address });
  const user = useAuthStore((s) => s.user);
  const {
    sendTransactionAsync,
    isPending: isSending,
    txStatus,
  } = useSendTransaction({ waitFor: "inBlock" });

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [purchased, setPurchased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [progress, setProgress] = useState<CourseProgress | null>(null);

  const isConnected = status === "connected" && !!address;

  useEffect(() => {
    async function load() {
      try {
        const [c, l] = await Promise.all([
          coursesApi.get(id),
          lessonsApi.listByCourse(id),
        ]);
        setCourse(c);
        setLessons(l);

        // Check purchase status (scoped to authenticated user via JWT)
        if (user) {
          const purchases = await purchasesApi.list({ course_id: id });
          if (purchases.length > 0) setPurchased(true);

          // Load progress
          try {
            const prog = await progressApi.courseProgress(id);
            setProgress(prog);
          } catch {
            // Not critical — progress just won't show
          }
        }
      } catch {
        toast.error("Failed to load course.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, user]);

  async function handlePurchase() {
    if (!user || !address || !course || !api || !isApiReady) return;

    if (!course.platform_wallet_address) {
      toast.error("Platform wallet address not found. Cannot purchase.");
      return;
    }

    // Balance check
    if (balance) {
      const transferable = parseFloat(balance.formattedTransferable);
      if (transferable < course.price) {
        toast.error(
          `Insufficient balance. You have ${balance.formattedTransferable} PAS but need ${course.price} PAS.`,
        );
        return;
      }
    }

    setPurchasing(true);
    try {
      // Convert price to planck (1 token = 10^10 planck on Paseo)
      const amountInPlanck = BigInt(Math.floor(course.price * 1e10));

      toast.info("Please confirm the transaction in your wallet...");

      // Send PAS to the platform wallet
      const tx = api.tx.balances.transferKeepAlive(
        course.platform_wallet_address,
        amountInPlanck,
      );

      // Send via lunokit
      const receipt = await sendTransactionAsync({ extrinsic: tx });

      if (receipt.status === "failed") {
        toast.error(
          "Transaction failed on-chain. Your funds were not transferred.",
        );
        setPurchasing(false);
        return;
      }

      toast.info("Transaction confirmed! Verifying with the server...");

      // Verify with backend (user_id inferred from JWT)
      await purchasesApi.create({
        course_id: course.id,
        transaction_hash: receipt.transactionHash,
        block_hash: receipt.blockHash,
      });

      setPurchased(true);
      toast.success(
        "Course purchased successfully! You can now access all lessons.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Purchase failed. Please try again.";
      if (message.includes("Cancelled") || message.includes("cancel")) {
        toast.warning("Transaction cancelled.");
      } else {
        toast.error(message);
      }
    } finally {
      setPurchasing(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Skeleton className="mb-4 h-10 w-2/3" />
        <Skeleton className="mb-8 h-6 w-full" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
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

  const isFree = course.price === 0;
  const hasAccess = purchased || isFree || user?.role === "Teacher";

  // Build a map of lesson progress for quick lookup
  const lessonProgressMap: Record<string, LessonProgressSummary> = {};
  if (progress) {
    for (const lp of progress.lessons) {
      lessonProgressMap[lp.lesson_id] = lp;
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {/* Back link */}
      <BlurFade delay={0.05}>
        <Link
          href="/courses"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          All Courses
        </Link>
      </BlurFade>

      {/* Course header */}
      <BlurFade delay={0.1}>
        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Badge
              variant="secondary"
              className="gap-1.5 bg-primary/10 text-primary"
            >
              <Coins className="h-3 w-3" />
              {isFree ? "Free" : `${course.price} PAS`}
            </Badge>
            {purchased && (
              <Badge
                variant="secondary"
                className="gap-1.5 text-green-600 bg-green-500/10"
              >
                <CheckCircle2 className="h-3 w-3" />
                Purchased
              </Badge>
            )}
            <Badge variant="outline" className="gap-1.5">
              <BookOpen className="h-3 w-3" />
              {lessons.length} lessons
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {course.title}
          </h1>
          <DescriptionRenderer
            html={course.description}
            className="mt-3 text-muted-foreground leading-relaxed"
          />
        </div>
      </BlurFade>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Lessons list */}
        <div className="lg:col-span-2 space-y-3">
          <BlurFade delay={0.15}>
            <h2 className="text-xl font-semibold mb-4">Lessons</h2>
          </BlurFade>
          {lessons.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No lessons yet. Check back soon.
            </p>
          ) : (
            lessons.map((lesson, i) => (
              <BlurFade key={lesson.id} delay={0.2 + i * 0.05}>
                {hasAccess ? (
                  <Link href={`/courses/${id}/lessons/${lesson.id}`}>
                    <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                            lessonProgressMap[lesson.id]?.passed
                              ? "bg-green-500/10 text-green-600 dark:text-green-400"
                              : lessonProgressMap[lesson.id]?.completed
                                ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                          }`}
                        >
                          {lessonProgressMap[lesson.id]?.passed ? (
                            <Trophy className="h-4 w-4" />
                          ) : lessonProgressMap[lesson.id]?.completed ? (
                            <CircleAlert className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">
                            {lesson.title}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {lessonProgressMap[lesson.id]?.passed
                              ? `Passed - ${lessonProgressMap[lesson.id].correct}/${lessonProgressMap[lesson.id].total_questions} correct (${lessonProgressMap[lesson.id].score_pct}%)`
                              : lessonProgressMap[lesson.id]?.completed
                                ? `${lessonProgressMap[lesson.id].correct}/${lessonProgressMap[lesson.id].total_questions} correct (${lessonProgressMap[lesson.id].score_pct}%) — needs 70% to pass`
                                : lessonProgressMap[lesson.id]?.answered > 0
                                  ? `In progress — ${lessonProgressMap[lesson.id].answered}/${lessonProgressMap[lesson.id].total_questions} answered`
                                  : stripHtml(lesson.description)}
                          </p>
                        </div>
                        <div className="hidden items-center gap-2 sm:flex">
                          {lessonProgressMap[lesson.id]?.passed && (
                            <Badge
                              variant="secondary"
                              className="gap-1 text-xs bg-green-500/10 text-green-600 dark:text-green-400"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Passed
                            </Badge>
                          )}
                          {lesson.payback_amount > 0 && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Coins className="h-3 w-3" />+
                              {lesson.payback_amount} PAS
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ) : (
                  <Card className="opacity-60">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{lesson.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Purchase the course to unlock
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </BlurFade>
            ))
          )}
        </div>

        {/* Purchase sidebar */}
        <div className="lg:col-span-1">
          <BlurFade delay={0.2}>
            <div className="sticky top-24">
              <Card className="relative overflow-hidden">
                {!hasAccess && (
                  <BorderBeam
                    size={120}
                    duration={6}
                    colorFrom="#e6007a"
                    colorTo="#552bbf"
                  />
                )}
                <CardHeader>
                  <CardTitle className="text-lg">
                    {hasAccess ? "You have access" : "Unlock this course"}
                  </CardTitle>
                  {!hasAccess && (
                    <CardDescription>
                      Pay with PAS to access all lessons and quizzes.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasAccess ? (
                    <>
                      <div className="flex items-center gap-3 rounded-lg bg-green-500/10 p-4 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <p className="text-sm font-medium">
                          Full access to all {lessons.length} lessons
                        </p>
                      </div>

                      {/* Progress summary */}
                      {progress && progress.total_lessons > 0 && (
                        <div className="space-y-3">
                          <Separator />
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Completed
                              </span>
                              <span className="font-medium">
                                {progress.completed_lessons}/
                                {progress.total_lessons} lessons
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Passed
                              </span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {progress.passed_lessons}/
                                {progress.total_lessons} lessons
                              </span>
                            </div>
                            {progress.total_earned > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  Earned
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="gap-1 bg-primary/10 text-primary"
                                >
                                  <Coins className="h-3 w-3" />
                                  {progress.total_earned} PAS
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="text-center">
                        <span className="text-4xl font-bold text-primary">
                          {course.price}
                        </span>
                        <span className="ml-2 text-lg text-muted-foreground">
                          PAS
                        </span>
                      </div>

                      {balance && (
                        <p className="text-center text-sm text-muted-foreground">
                          Your balance: {balance.formattedTransferable} PAS
                        </p>
                      )}

                      <Separator />

                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          On-chain payment verification
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          Access to all {lessons.length} lessons
                        </div>
                        <div className="flex items-center gap-2">
                          <Coins className="h-4 w-4 text-primary" />
                          Earn PAS back by completing quizzes
                        </div>
                      </div>

                      {!isConnected ? (
                        <p className="text-center text-sm text-muted-foreground">
                          Connect your wallet to purchase.
                        </p>
                      ) : !user ? (
                        <Link href="/onboarding">
                          <Button className="w-full">Register first</Button>
                        </Link>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              className="w-full h-11"
                              disabled={purchasing || isSending || !isApiReady}
                            >
                              {purchasing || isSending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  {txStatus === "signing"
                                    ? "Confirm in wallet..."
                                    : txStatus === "pending"
                                      ? "Waiting for block..."
                                      : "Processing..."}
                                </>
                              ) : (
                                <>
                                  <Coins className="mr-2 h-4 w-4" />
                                  Purchase for {course.price} PAS
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Confirm Purchase
                              </AlertDialogTitle>
                              <AlertDialogDescription className="space-y-3">
                                <span className="block">
                                  You are about to purchase{" "}
                                  <strong>{course.title}</strong> for{" "}
                                  <strong>{course.price} PAS</strong>.
                                </span>
                                <span className="block text-xs">
                                  This will send {course.price} PAS from your
                                  wallet to the platform. This action is
                                  irreversible once confirmed.
                                </span>
                                {balance && (
                                  <span className="block text-xs">
                                    Your balance:{" "}
                                    {balance.formattedTransferable} PAS
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handlePurchase}>
                                Confirm Purchase
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </BlurFade>
        </div>
      </div>
    </div>
  );
}
