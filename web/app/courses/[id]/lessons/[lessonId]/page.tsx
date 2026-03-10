"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  lessonsApi,
  quizzesApi,
  quizAnswersApi,
  progressApi,
  coursesApi,
  purchasesApi,
  type Lesson,
  type Quiz,
  type LessonProgress,
  type Course,
  type CourseProgress,
  type LessonProgressSummary,
} from "@/lib/api";
import { useUserStore } from "@/lib/user-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Confetti } from "@/components/ui/confetti";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Coins,
  XCircle,
  Trophy,
  Brain,
  RotateCcw,
  Play,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  CircleAlert,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DescriptionRenderer } from "@/components/description-renderer";

export default function LessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id: courseId, lessonId } = use(params);
  const router = useRouter();
  const user = useUserStore((s) => s.user);

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(
    null,
  );

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Quiz state
  const [currentQuiz, setCurrentQuiz] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Previous progress (for revisiting)
  const [previousProgress, setPreviousProgress] =
    useState<LessonProgress | null>(null);
  const [showingPreviousResults, setShowingPreviousResults] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [c, l, currentLesson] = await Promise.all([
          coursesApi.get(courseId),
          lessonsApi.listByCourse(courseId),
          lessonsApi.get(lessonId),
        ]);
        setCourse(c);
        setLessons(l);
        setLesson(currentLesson);

        const q = await quizzesApi.listByLesson(lessonId);
        setQuizzes(q);

        // Load existing progress if user is logged in
        if (user) {
          try {
            const [prog, cProg] = await Promise.all([
              progressApi.lessonProgress(lessonId, user.id),
              progressApi.courseProgress(courseId, user.id),
            ]);
            if (prog.answered > 0) {
              setPreviousProgress(prog);
              if (prog.completed) {
                setShowingPreviousResults(true);
              }
            }
            setCourseProgress(cProg);
          } catch {
            // Not critical
          }
        }
      } catch {
        toast.error("Failed to load lesson.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId, lessonId, user]);

  // Reset quiz state when lesson changes
  useEffect(() => {
    setCurrentQuiz(0);
    setSelectedOption(null);
    setAnswered(false);
    setScore(0);
    setCompleted(false);
    setShowConfetti(false);
    setShowingPreviousResults(false);
    setPreviousProgress(null);
  }, [lessonId]);

  function getVideoEmbedUrl(url: string): string | null {
    try {
      const u = new URL(url);
      let videoId: string | null = null;
      if (u.hostname.includes("youtube.com")) {
        videoId = u.searchParams.get("v");
      } else if (u.hostname.includes("youtu.be")) {
        videoId = u.pathname.slice(1);
      }
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    } catch {
      // not a valid URL
    }
    return null;
  }

  async function handleAnswer() {
    if (selectedOption === null || !user) return;
    setAnswered(true);

    const quiz = quizzes[currentQuiz];
    const isCorrect = selectedOption === quiz.correct_option;
    if (isCorrect) setScore((s) => s + 1);

    // Submit answer to backend
    try {
      await quizAnswersApi.create(quiz.id, {
        quiz_id: quiz.id,
        selected_option: selectedOption,
        user_id: user.id,
      });
    } catch {
      // non-critical
    }
  }

  function handleNext() {
    if (currentQuiz < quizzes.length - 1) {
      setCurrentQuiz((c) => c + 1);
      setSelectedOption(null);
      setAnswered(false);
    } else {
      setCompleted(true);
      const finalScore = score;
      const pct = (finalScore / quizzes.length) * 100;
      if (pct >= 70) {
        setShowConfetti(true);
        toast.success("Congratulations! You passed the quiz!");
      }
    }
  }

  function handleRetakeQuiz() {
    setShowingPreviousResults(false);
    setCurrentQuiz(0);
    setSelectedOption(null);
    setAnswered(false);
    setScore(0);
    setCompleted(false);
    setShowConfetti(false);
  }

  // Navigation helpers
  const currentIndex = lessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  // Build lesson progress map
  const lessonProgressMap: Record<string, LessonProgressSummary> = {};
  if (courseProgress) {
    for (const lp of courseProgress.lessons) {
      lessonProgressMap[lp.lesson_id] = lp;
    }
  }

  if (loading) {
    return (
      <div className="flex h-full">
        {/* Sidebar skeleton */}
        <div className="hidden w-80 shrink-0 border-r border-border/50 bg-muted/30 p-4 lg:block">
          <Skeleton className="mb-6 h-6 w-3/4" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>
        {/* Content skeleton */}
        <div className="flex-1 p-6">
          <Skeleton className="mb-4 h-8 w-1/2" />
          <Skeleton className="mb-8 aspect-video w-full max-w-4xl rounded-xl" />
          <Skeleton className="h-40 max-w-4xl" />
        </div>
      </div>
    );
  }

  if (!lesson || !course) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h2 className="text-xl font-bold">Lesson not found</h2>
        <Link href="/courses">
          <Button variant="link" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to courses
          </Button>
        </Link>
      </div>
    );
  }

  const embedUrl = getVideoEmbedUrl(lesson.video_url);
  const quiz = quizzes[currentQuiz];
  const progressPct =
    quizzes.length > 0
      ? ((currentQuiz + (answered ? 1 : 0)) / quizzes.length) * 100
      : 0;
  const completedLessonsCount = courseProgress?.passed_lessons ?? 0;
  const totalLessonsCount = lessons.length;
  const courseCompletionPct =
    totalLessonsCount > 0
      ? Math.round((completedLessonsCount / totalLessonsCount) * 100)
      : 0;

  return (
    <div className="relative flex h-full overflow-hidden bg-background">
      {showConfetti && (
        <Confetti
          className="pointer-events-none absolute inset-0 z-50 h-full w-full"
          options={{
            spread: 360,
            ticks: 100,
            gravity: 0.5,
            startVelocity: 30,
            particleCount: 150,
            origin: { x: 0.5, y: 0.3 },
          }}
          manualstart={false}
        />
      )}

      {/* ==================== SIDEBAR ==================== */}
      <aside
        className={cn(
          "shrink-0 border-r border-border/50 bg-card flex flex-col transition-all duration-300",
          sidebarOpen ? "w-80" : "w-0",
          "max-lg:fixed max-lg:inset-y-16 max-lg:left-0 max-lg:z-40",
          !sidebarOpen && "max-lg:w-0 lg:w-0",
        )}
      >
        {sidebarOpen && (
          <>
            {/* Sidebar header */}
            <div className="shrink-0 border-b border-border/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/courses/${courseId}`}
                  className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors min-w-0"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  <span className="truncate">Back to course</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setSidebarOpen(false)}
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
              <h2 className="mt-3 font-semibold text-sm leading-tight line-clamp-2">
                {course.title}
              </h2>
              {/* Course progress bar */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {completedLessonsCount}/{totalLessonsCount} lessons passed
                  </span>
                  <span>{courseCompletionPct}%</span>
                </div>
                <Progress value={courseCompletionPct} className="h-1.5" />
              </div>
            </div>

            {/* Sidebar lesson list */}
            <ScrollArea className="flex-1">
              <div className="p-2">
                <p className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Course content
                </p>
                <nav className="space-y-1">
                  {lessons.map((l, i) => {
                    const isActive = l.id === lessonId;
                    const lProg = lessonProgressMap[l.id];
                    const passed = lProg?.passed;
                    const attemptedNotPassed =
                      lProg?.completed && !lProg?.passed;
                    const inProgress =
                      lProg && lProg.answered > 0 && !lProg.completed;

                    return (
                      <Link
                        key={l.id}
                        href={`/courses/${courseId}/lessons/${l.id}`}
                      >
                        <div
                          className={cn(
                            "flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                            isActive
                              ? "bg-primary/10 text-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {/* Status indicator */}
                          <div
                            className={cn(
                              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                              passed
                                ? "bg-green-500/15 text-green-600 dark:text-green-400"
                                : attemptedNotPassed
                                  ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                                  : isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground",
                            )}
                          >
                            {passed ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : attemptedNotPassed ? (
                              <CircleAlert className="h-3.5 w-3.5" />
                            ) : isActive ? (
                              <Play className="h-3 w-3" />
                            ) : (
                              <span>{i + 1}</span>
                            )}
                          </div>
                          {/* Lesson info */}
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "leading-snug line-clamp-2",
                                isActive && "font-medium",
                              )}
                            >
                              {l.title}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              {l.payback_amount > 0 && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Coins className="h-3 w-3" />
                                  {l.payback_amount} PAS
                                </span>
                              )}
                              {passed && (
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                  Passed
                                </span>
                              )}
                              {inProgress && (
                                <span className="text-xs text-blue-600 dark:text-blue-400">
                                  In progress
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </ScrollArea>
          </>
        )}
      </aside>

      {/* Sidebar backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border/50 bg-card px-4 py-2">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-sm text-muted-foreground shrink-0">
              Lesson {currentIndex + 1} of {lessons.length}
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm font-medium truncate">{lesson.title}</span>
          </div>
          {/* Prev / Next navigation */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              disabled={!prevLesson}
              onClick={() =>
                prevLesson &&
                router.push(`/courses/${courseId}/lessons/${prevLesson.id}`)
              }
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Prev</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!nextLesson}
              onClick={() =>
                nextLesson &&
                router.push(`/courses/${courseId}/lessons/${nextLesson.id}`)
              }
              className="gap-1.5"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          {/* Video — full width, edge-to-edge */}
          <div className="bg-black">
            {embedUrl ? (
              <div className="aspect-video">
                <iframe
                  src={embedUrl}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={lesson.title}
                />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center">
                <a
                  href={lesson.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Watch video externally
                </a>
              </div>
            )}
          </div>

          {/* Content below video */}
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
            {/* Lesson title & description */}
            <div className="mb-6">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {lesson.payback_amount > 0 && (
                  <Badge
                    variant="secondary"
                    className="gap-1.5 bg-primary/10 text-primary"
                  >
                    <Coins className="h-3 w-3" />
                    Earn {lesson.payback_amount} PAS
                  </Badge>
                )}
                {quizzes.length > 0 && (
                  <Badge variant="outline" className="gap-1.5">
                    <Brain className="h-3 w-3" />
                    {quizzes.length} quiz questions
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {lesson.title}
              </h1>
              {lesson.description && (
                <DescriptionRenderer
                  html={lesson.description}
                  className="mt-2 text-muted-foreground"
                />
              )}
            </div>

            {/* Quiz section */}
            {quizzes.length > 0 && (
              <>
                <Separator className="mb-8" />
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Quiz
                  </h2>
                  {showingPreviousResults ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={handleRetakeQuiz}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Retake Quiz
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {currentQuiz + 1} / {quizzes.length}
                    </span>
                  )}
                </div>

                {/* Previous results view */}
                {showingPreviousResults && previousProgress ? (
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="flex flex-col items-center py-8 text-center">
                        <Trophy
                          className={cn(
                            "mb-3 h-12 w-12",
                            previousProgress.passed
                              ? "text-primary"
                              : "text-muted-foreground",
                          )}
                        />
                        <h3 className="text-xl font-bold">
                          {previousProgress.passed
                            ? "Quiz Passed!"
                            : "Quiz Completed"}
                        </h3>
                        <p className="mt-1 text-lg text-muted-foreground">
                          Score:{" "}
                          <span
                            className={cn(
                              "font-bold",
                              previousProgress.passed
                                ? "text-primary"
                                : "text-orange-500",
                            )}
                          >
                            {previousProgress.correct}/
                            {previousProgress.total_questions}
                          </span>{" "}
                          ({previousProgress.score_pct}%)
                        </p>
                        {previousProgress.passed &&
                          lesson.payback_amount > 0 && (
                            <Badge className="mt-3 gap-2 bg-green-500/10 text-green-600 dark:text-green-400 py-2 px-4">
                              <Coins className="h-4 w-4" />
                              Earned {lesson.payback_amount} PAS
                            </Badge>
                          )}
                        {!previousProgress.passed && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            You need 70% to pass. Try again!
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Per-question results */}
                    <div className="space-y-3">
                      {previousProgress.results.map((result, i) => (
                        <Card
                          key={result.quiz_id}
                          className={cn(
                            "border-l-4",
                            result.is_correct
                              ? "border-l-green-500"
                              : "border-l-red-500",
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                Q{i + 1}
                              </Badge>
                              {result.is_correct ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {result.is_correct ? "Correct" : "Incorrect"}
                              </span>
                            </div>
                            <p className="mb-3 font-medium">
                              {result.question}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {[
                                { key: 1, text: result.option_a },
                                { key: 2, text: result.option_b },
                                { key: 3, text: result.option_c },
                                { key: 4, text: result.option_d },
                              ].map((opt) => {
                                const isCorrect =
                                  opt.key === result.correct_option;
                                const isSelected =
                                  opt.key === result.selected_option;
                                return (
                                  <div
                                    key={opt.key}
                                    className={cn(
                                      "rounded-md border p-2.5 text-sm",
                                      isCorrect &&
                                        "border-green-500 bg-green-500/10",
                                      isSelected &&
                                        !isCorrect &&
                                        "border-red-500 bg-red-500/10",
                                      !isCorrect &&
                                        !isSelected &&
                                        "border-border opacity-50",
                                    )}
                                  >
                                    <span className="mr-2 font-semibold">
                                      {String.fromCharCode(64 + opt.key)}.
                                    </span>
                                    {opt.text}
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Bottom actions */}
                    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                      {nextLesson ? (
                        <Link
                          href={`/courses/${courseId}/lessons/${nextLesson.id}`}
                        >
                          <Button variant="outline" className="gap-2">
                            Next Lesson
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/courses/${courseId}`}>
                          <Button variant="outline" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to course
                          </Button>
                        </Link>
                      )}
                      <Button className="gap-2" onClick={handleRetakeQuiz}>
                        <RotateCcw className="h-4 w-4" />
                        Retake Quiz
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Active quiz taking */}
                    <Progress value={progressPct} className="mb-6 h-2" />

                    {completed ? (
                      <Card>
                        <CardContent className="flex flex-col items-center py-10 text-center">
                          <Trophy className="mb-4 h-16 w-16 text-primary" />
                          <h3 className="text-2xl font-bold">Quiz Complete!</h3>
                          <p className="mt-2 text-lg text-muted-foreground">
                            You scored{" "}
                            <span className="font-bold text-primary">
                              {score}/{quizzes.length}
                            </span>{" "}
                            ({Math.round((score / quizzes.length) * 100)}%)
                          </p>
                          {score / quizzes.length >= 0.7 &&
                            lesson.payback_amount > 0 && (
                              <Badge className="mt-4 gap-2 bg-green-500/10 text-green-600 dark:text-green-400 py-2 px-4">
                                <Coins className="h-4 w-4" />
                                You earned {lesson.payback_amount} PAS!
                              </Badge>
                            )}
                          <div className="mt-6 flex gap-3">
                            {nextLesson ? (
                              <Link
                                href={`/courses/${courseId}/lessons/${nextLesson.id}`}
                              >
                                <Button className="gap-2">
                                  Next Lesson
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </Link>
                            ) : (
                              <Link href={`/courses/${courseId}`}>
                                <Button variant="outline" className="gap-2">
                                  <ArrowLeft className="h-4 w-4" />
                                  Back to course
                                </Button>
                              </Link>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ) : quiz ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg leading-relaxed">
                            {quiz.question}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {[
                            { key: 1, text: quiz.option_a },
                            { key: 2, text: quiz.option_b },
                            { key: 3, text: quiz.option_c },
                            { key: 4, text: quiz.option_d },
                          ].map((option) => {
                            const isSelected = selectedOption === option.key;
                            const isCorrect =
                              option.key === quiz.correct_option;
                            return (
                              <button
                                key={option.key}
                                type="button"
                                disabled={answered}
                                onClick={() => setSelectedOption(option.key)}
                                className={cn(
                                  "w-full rounded-lg border-2 p-4 text-left transition-all",
                                  !answered &&
                                    isSelected &&
                                    "border-primary bg-primary/5",
                                  !answered &&
                                    !isSelected &&
                                    "border-border hover:border-primary/40",
                                  answered &&
                                    isCorrect &&
                                    "border-green-500 bg-green-500/10",
                                  answered &&
                                    isSelected &&
                                    !isCorrect &&
                                    "border-red-500 bg-red-500/10",
                                  answered &&
                                    !isSelected &&
                                    !isCorrect &&
                                    "border-border opacity-50",
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold border-inherit">
                                    {String.fromCharCode(64 + option.key)}
                                  </span>
                                  <span className="flex-1">{option.text}</span>
                                  {answered && isCorrect && (
                                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                                  )}
                                  {answered && isSelected && !isCorrect && (
                                    <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                                  )}
                                </div>
                              </button>
                            );
                          })}

                          <div className="flex justify-end gap-3 pt-4">
                            {!answered ? (
                              <Button
                                onClick={handleAnswer}
                                disabled={selectedOption === null}
                              >
                                Submit Answer
                              </Button>
                            ) : (
                              <Button onClick={handleNext}>
                                {currentQuiz < quizzes.length - 1
                                  ? "Next Question"
                                  : "See Results"}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ) : null}
                  </>
                )}
              </>
            )}

            {/* Bottom navigation for no-quiz lessons */}
            {quizzes.length === 0 && (
              <div className="mt-8 flex items-center justify-between">
                {prevLesson ? (
                  <Link href={`/courses/${courseId}/lessons/${prevLesson.id}`}>
                    <Button variant="outline" className="gap-2">
                      <ChevronLeft className="h-4 w-4" />
                      Previous Lesson
                    </Button>
                  </Link>
                ) : (
                  <div />
                )}
                {nextLesson ? (
                  <Link href={`/courses/${courseId}/lessons/${nextLesson.id}`}>
                    <Button className="gap-2">
                      Next Lesson
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/courses/${courseId}`}>
                    <Button variant="outline" className="gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Finish Course
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
