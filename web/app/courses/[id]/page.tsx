"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  coursesApi,
  lessonsApi,
  purchasesApi,
  type Course,
  type Lesson,
} from "@/lib/api";
import { useUserStore } from "@/lib/user-store";
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
import { BorderBeam } from "@/components/ui/border-beam";
import { ShineBorder } from "@/components/ui/shine-border";
import {
  BookOpen,
  Coins,
  Play,
  CheckCircle2,
  Loader2,
  Lock,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

const RECIPIENT_WALLET =
  process.env.NEXT_PUBLIC_RECIPIENT_WALLET ??
  "1RPK4brFegTGGKHFpjZ7jxZ3jiwCMyihhMFQomyzHAJfcUV";

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { address } = useAccount();
  const status = useStatus();
  const { api, isApiReady } = useApi();
  const { data: balance } = useBalance({ address });
  const user = useUserStore((s) => s.user);
  const { sendTransactionAsync, isPending: isSending, txStatus } = useSendTransaction({ waitFor: "inBlock" });

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [purchased, setPurchased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

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

        // Check purchase status
        if (user) {
          const purchases = await purchasesApi.list({
            course_id: id,
            user_id: user.id,
          });
          if (purchases.length > 0) setPurchased(true);
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

    setPurchasing(true);
    try {
      // Convert price to planck (1 PAS = 10^10 planck on Paseo)
      const amountInPlanck = BigInt(Math.floor(course.price * 1e10));

      // Create transfer extrinsic using the dedot API
      const tx = api.tx.balances.transferKeepAlive(RECIPIENT_WALLET, amountInPlanck);

      // Send via lunokit
      const receipt = await sendTransactionAsync({ extrinsic: tx });

      if (receipt.status === "failed") {
        toast.error("Transaction failed on-chain.");
        setPurchasing(false);
        return;
      }

      // Verify with backend
      await purchasesApi.create({
        course_id: course.id,
        user_id: user.id,
        transaction_hash: receipt.transactionHash,
      });

      setPurchased(true);
      toast.success("Course purchased successfully! You can now access all lessons.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Purchase failed. Please try again."
      );
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
              <Badge variant="secondary" className="gap-1.5 text-green-600 bg-green-500/10">
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
          <p className="mt-3 text-muted-foreground leading-relaxed">
            {course.description}
          </p>
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
                  <Link href={`/lessons/${lesson.id}`}>
                    <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Play className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">
                            {lesson.title}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {lesson.description}
                          </p>
                        </div>
                        {lesson.payback_amount > 0 && (
                          <Badge variant="outline" className="shrink-0 gap-1 text-xs">
                            <Coins className="h-3 w-3" />
                            +{lesson.payback_amount} PAS
                          </Badge>
                        )}
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
                      Pay with PAS tokens to access all lessons and quizzes.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasAccess ? (
                    <div className="flex items-center gap-3 rounded-lg bg-green-500/10 p-4 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      <p className="text-sm font-medium">
                        Full access to all {lessons.length} lessons
                      </p>
                    </div>
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
                          <Button className="w-full">
                            Register first
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          className="w-full h-11"
                          onClick={handlePurchase}
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
