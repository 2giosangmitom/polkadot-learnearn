"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  lessonsApi,
  quizzesApi,
  quizAnswersApi,
  type Lesson,
  type Quiz,
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

  useEffect(() => {
    async function load() {
      try {
        const l = await lessonsApi.get(id);
        setLesson(l);
        const q = await quizzesApi.listByLesson(id);
        setQuizzes(q);
      } catch {
        toast.error("Failed to load lesson.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

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
      const pct = ((score + (selectedOption === quizzes[currentQuiz]?.correct_option ? 0 : 0)) / quizzes.length) * 100;
      if (pct >= 70) {
        setShowConfetti(true);
        toast.success("Congratulations! You passed the quiz!");
      }
    }
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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Quiz
            </h2>
            <span className="text-sm text-muted-foreground">
              {currentQuiz + 1} / {quizzes.length}
            </span>
          </div>
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
        </BlurFade>
      )}
    </div>
  );
}
