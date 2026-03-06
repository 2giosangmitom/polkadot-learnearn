"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  lessonsApi,
  quizzesApi,
  quizAnswersApi,
  progressApi,
  type Lesson,
  type Quiz,
  type LessonProgress,
} from "@/lib/api";
import { useUserStore } from "@/lib/user-store";
import { BlurFade } from "@/components/ui/blur-fade";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Confetti } from "@/components/ui/confetti";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Coins,
  XCircle,
  Trophy,
  Brain,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const user = useUserStore((s) => s.user);

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  // Quiz state
  const [currentQuiz, setCurrentQuiz] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Previous progress (for revisiting)
  const [previousProgress, setPreviousProgress] = useState<LessonProgress | null>(null);
  const [showingPreviousResults, setShowingPreviousResults] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const l = await lessonsApi.get(id);
        setLesson(l);
        const q = await quizzesApi.listByLesson(id);
        setQuizzes(q);

        // Load existing progress if user is logged in
        if (user) {
          try {
            const prog = await progressApi.lessonProgress(id, user.id);
            if (prog.answered > 0) {
              setPreviousProgress(prog);
              // If already completed, show previous results by default
              if (prog.completed) {
                setShowingPreviousResults(true);
              }
            }
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
  }, [id, user]);

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

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Skeleton className="mb-4 h-8 w-1/2" />
        <Skeleton className="mb-8 aspect-video w-full rounded-xl" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!lesson) {
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
  const progressPct = quizzes.length > 0 ? ((currentQuiz + (answered ? 1 : 0)) / quizzes.length) * 100 : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      {showConfetti && (
        <Confetti
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

      {/* Back link */}
      <BlurFade delay={0.05}>
        <Link
          href={`/courses/${lesson.course_id}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to course
        </Link>
      </BlurFade>

      {/* Lesson header */}
      <BlurFade delay={0.1}>
        <div className="mb-6">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {lesson.payback_amount > 0 && (
              <Badge variant="secondary" className="gap-1.5 bg-primary/10 text-primary">
                <Coins className="h-3 w-3" />
                Earn {lesson.payback_amount} PAS
              </Badge>
            )}
            <Badge variant="outline" className="gap-1.5">
              <Brain className="h-3 w-3" />
              {quizzes.length} quiz questions
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {lesson.title}
          </h1>
          <p className="mt-2 text-muted-foreground">{lesson.description}</p>
        </div>
      </BlurFade>

      {/* Video */}
      <BlurFade delay={0.15}>
        <div className="mb-10 overflow-hidden rounded-xl border border-border/50 bg-black">
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
      </BlurFade>

      {/* Quiz section */}
      {quizzes.length > 0 && (
        <BlurFade delay={0.2}>
          <Separator className="mb-8" />
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Quiz
            </h2>
            {showingPreviousResults ? (
              <Button variant="outline" size="sm" className="gap-2" onClick={handleRetakeQuiz}>
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
              {/* Score summary card */}
              <Card>
                <CardContent className="flex flex-col items-center py-8 text-center">
                  <Trophy className={cn(
                    "mb-3 h-12 w-12",
                    previousProgress.passed ? "text-primary" : "text-muted-foreground"
                  )} />
                  <h3 className="text-xl font-bold">
                    {previousProgress.passed ? "Quiz Passed!" : "Quiz Completed"}
                  </h3>
                  <p className="mt-1 text-lg text-muted-foreground">
                    Score:{" "}
                    <span className={cn(
                      "font-bold",
                      previousProgress.passed ? "text-primary" : "text-orange-500"
                    )}>
                      {previousProgress.correct}/{previousProgress.total_questions}
                    </span>{" "}
                    ({previousProgress.score_pct}%)
                  </p>
                  {previousProgress.passed && lesson.payback_amount > 0 && (
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
                  <Card key={result.quiz_id} className={cn(
                    "border-l-4",
                    result.is_correct ? "border-l-green-500" : "border-l-red-500"
                  )}>
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Q{i + 1}</Badge>
                        {result.is_correct ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {result.is_correct ? "Correct" : "Incorrect"}
                        </span>
                      </div>
                      <p className="mb-3 font-medium">{result.question}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          { key: 1, text: result.option_a },
                          { key: 2, text: result.option_b },
                          { key: 3, text: result.option_c },
                          { key: 4, text: result.option_d },
                        ].map((opt) => {
                          const isCorrect = opt.key === result.correct_option;
                          const isSelected = opt.key === result.selected_option;
                          return (
                            <div
                              key={opt.key}
                              className={cn(
                                "rounded-md border p-2.5 text-sm",
                                isCorrect && "border-green-500 bg-green-500/10",
                                isSelected && !isCorrect && "border-red-500 bg-red-500/10",
                                !isCorrect && !isSelected && "border-border opacity-50"
                              )}
                            >
                              <span className="mr-2 font-semibold">{String.fromCharCode(64 + opt.key)}.</span>
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
                <Link href={`/courses/${lesson.course_id}`}>
                  <Button variant="outline" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to course
                  </Button>
                </Link>
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
                {score / quizzes.length >= 0.7 && lesson.payback_amount > 0 && (
                  <Badge className="mt-4 gap-2 bg-green-500/10 text-green-600 dark:text-green-400 py-2 px-4">
                    <Coins className="h-4 w-4" />
                    You earned {lesson.payback_amount} PAS!
                  </Badge>
                )}
                <Link href={`/courses/${lesson.course_id}`} className="mt-6">
                  <Button variant="outline" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to course
                  </Button>
                </Link>
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
                  const isCorrect = option.key === quiz.correct_option;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      disabled={answered}
                      onClick={() => setSelectedOption(option.key)}
                      className={cn(
                        "w-full rounded-lg border-2 p-4 text-left transition-all",
                        !answered && isSelected && "border-primary bg-primary/5",
                        !answered && !isSelected && "border-border hover:border-primary/40",
                        answered && isCorrect && "border-green-500 bg-green-500/10",
                        answered && isSelected && !isCorrect && "border-red-500 bg-red-500/10",
                        answered && !isSelected && !isCorrect && "border-border opacity-50"
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
        </BlurFade>
      )}
    </div>
  );
}
