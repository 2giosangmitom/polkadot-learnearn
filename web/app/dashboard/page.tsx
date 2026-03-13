"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  coursesApi,
  lessonsApi,
  quizzesApi,
  youtubeApi,
  type Course,
  type LessonUpsert,
  type QuizUpsert,
  type CourseCreate,
  type CourseUpdate,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { normalizeYouTubeUrl, isValidYouTubeUrl, stripHtml } from "@/lib/utils";
import { TipTapEditor } from "@/components/tiptap-editor";
import { BlurFade } from "@/components/ui/blur-fade";
import { TextAnimate } from "@/components/ui/text-animate";
import { MagicCard } from "@/components/ui/magic-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Coins,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

// ---------------------------------------------------------------------------
// Types for the editor form state
// ---------------------------------------------------------------------------

interface LessonFormItem {
  /** Existing lesson ID, or null for newly added lessons */
  id: string | null;
  title: string;
  description: string;
  video_url: string;
  payback_amount: number;
  /** Client-side key for React list rendering */
  _key: string;
}

interface QuizFormItem {
  /** Existing quiz ID, or null for newly created quizzes */
  id: string | null;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: number;
  quiz_index: number;
  /** Client-side key for React list rendering */
  _key: string;
}

let nextKey = 0;
function genKey(prefix = "item") {
  return `${prefix}-${++nextKey}-${Date.now()}`;
}

function emptyLesson(): LessonFormItem {
  return {
    id: null,
    title: "",
    description: "",
    video_url: "",
    payback_amount: 0,
    _key: genKey("lesson"),
  };
}

function emptyQuiz(): QuizFormItem {
  return {
    id: null,
    question: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_option: 1,
    quiz_index: 0,
    _key: genKey("quiz"),
  };
}

const OPTION_LABELS: Record<number, string> = {
  1: "A",
  2: "B",
  3: "C",
  4: "D",
};

// ===========================================================================
// Main component
// ===========================================================================

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { theme } = useTheme();

  // --- View state: "list" or "editor" ---
  const [view, setView] = useState<"list" | "editor">("list");

  // --- Course list state ---
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Editor state ---
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [coursePrice, setCoursePrice] = useState(0);
  const [lessonItems, setLessonItems] = useState<LessonFormItem[]>([]);
  const [saving, setSaving] = useState(false);

  // --- Quiz state: keyed by lesson _key ---
  const [quizMap, setQuizMap] = useState<Record<string, QuizFormItem[]>>({});
  const [openQuizSections, setOpenQuizSections] = useState<Set<string>>(
    new Set(),
  );

  // AI quiz generation
  const [generatingQuiz, setGeneratingQuiz] = useState<string | null>(null);

  // YouTube auto-fill
  const [autoFillingYouTube, setAutoFillingYouTube] = useState<string | null>(
    null,
  );

  // --- Auth guard ---
  useEffect(() => {
    if (!user) {
      router.push("/onboarding");
      return;
    }
    if (user.role !== "Teacher") {
      router.push("/courses");
      return;
    }
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]);

  // --- Data fetching ---
  const loadCourses = useCallback(async () => {
    try {
      const all = await coursesApi.list();
      setCourses(all.filter((c) => c.author_id === user?.id));
    } catch {
      toast.error("Failed to load courses.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // --- Navigation helpers ---
  function openCreateEditor() {
    setEditingCourseId(null);
    setCourseTitle("");
    setCourseDescription("");
    setCoursePrice(0);
    setLessonItems([]);
    setQuizMap({});
    setOpenQuizSections(new Set());
    setView("editor");
  }

  async function openEditEditor(course: Course) {
    setEditingCourseId(course.id);
    setCourseTitle(course.title);
    setCourseDescription(course.description);
    setCoursePrice(course.price);
    setQuizMap({});
    setOpenQuizSections(new Set());
    setView("editor");

    // Load existing lessons
    try {
      const lessons = await lessonsApi.listByCourse(course.id);
      const sortedLessons = lessons.sort(
        (a, b) => a.lesson_index - b.lesson_index,
      );
      const items: LessonFormItem[] = sortedLessons.map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        video_url: l.video_url,
        payback_amount: l.payback_amount,
        _key: genKey("lesson"),
      }));
      setLessonItems(items);

      // Load quizzes for each saved lesson
      const newQuizMap: Record<string, QuizFormItem[]> = {};
      for (const item of items) {
        if (item.id) {
          try {
            const quizzes = await quizzesApi.listByLesson(item.id);
            const sortedQuizzes = quizzes.sort(
              (a, b) => a.quiz_index - b.quiz_index,
            );
            newQuizMap[item._key] = sortedQuizzes.map((q) => ({
              id: q.id,
              question: q.question,
              option_a: q.option_a,
              option_b: q.option_b,
              option_c: q.option_c,
              option_d: q.option_d,
              correct_option: q.correct_option,
              quiz_index: q.quiz_index,
              _key: genKey("quiz"),
            }));
          } catch {
            newQuizMap[item._key] = [];
          }
        }
      }
      setQuizMap(newQuizMap);
    } catch {
      toast.error("Failed to load lessons.");
      setLessonItems([]);
    }
  }

  function closeEditor() {
    setView("list");
    setEditingCourseId(null);
    setQuizMap({});
    setOpenQuizSections(new Set());
  }

  // --- Lesson list manipulation ---
  function addLesson() {
    setLessonItems((prev) => [...prev, emptyLesson()]);
  }

  function removeLesson(key: string) {
    setLessonItems((prev) => prev.filter((l) => l._key !== key));
    // Also remove quizzes for this lesson
    setQuizMap((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateLesson(
    key: string,
    field: keyof LessonFormItem,
    value: string | number,
  ) {
    let processedValue = value;

    // Normalize YouTube URLs when the video_url field is updated
    if (field === "video_url" && typeof value === "string") {
      processedValue = normalizeYouTubeUrl(value);
    }

    setLessonItems((prev) =>
      prev.map((l) => (l._key === key ? { ...l, [field]: processedValue } : l)),
    );
  }

  function moveLessonUp(index: number) {
    if (index <= 0) return;
    setLessonItems((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveLessonDown(index: number) {
    setLessonItems((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  // --- YouTube auto-fill ---
  async function autoFillFromYouTube(lessonKey: string) {
    const lesson = lessonItems.find((l) => l._key === lessonKey);
    if (!lesson || !isValidYouTubeUrl(lesson.video_url)) {
      return;
    }

    setAutoFillingYouTube(lessonKey);

    try {
      const metadata = await youtubeApi.getMetadata(lesson.video_url);

      if (metadata.success && metadata.title) {
        // Only auto-fill if fields are empty to avoid overwriting user input
        if (!lesson.title.trim() && metadata.title) {
          updateLesson(lessonKey, "title", metadata.title);
        }

        if (!lesson.description.trim() && metadata.description) {
          // Use the full YouTube description
          updateLesson(lessonKey, "description", metadata.description);
        }
      }
    } catch (error) {
      console.error("Failed to fetch YouTube metadata:", error);
    } finally {
      setAutoFillingYouTube(null);
    }
  }

  // --- Quiz manipulation ---
  function toggleQuizSection(lessonKey: string) {
    setOpenQuizSections((prev) => {
      const next = new Set(prev);
      if (next.has(lessonKey)) next.delete(lessonKey);
      else next.add(lessonKey);
      return next;
    });
  }

  function addQuiz(lessonKey: string) {
    setQuizMap((prev) => ({
      ...prev,
      [lessonKey]: [...(prev[lessonKey] ?? []), emptyQuiz()],
    }));
  }

  function removeQuizFromState(lessonKey: string, quizKey: string) {
    setQuizMap((prev) => ({
      ...prev,
      [lessonKey]: (prev[lessonKey] ?? []).filter((q) => q._key !== quizKey),
    }));
  }

  function updateQuizField(
    lessonKey: string,
    quizKey: string,
    field: keyof QuizFormItem,
    value: string | number,
  ) {
    setQuizMap((prev) => ({
      ...prev,
      [lessonKey]: (prev[lessonKey] ?? []).map((q) =>
        q._key === quizKey ? { ...q, [field]: value } : q,
      ),
    }));
  }

  // --- Refresh form state from server response (updates IDs after save) ---
  function _refreshFromResponse(
    result: import("@/lib/api").CourseWithLessonsResponse,
  ) {
    // Rebuild lessonItems and quizMap with server-assigned IDs
    const newLessonItems: LessonFormItem[] = result.lessons
      .sort((a, b) => a.lesson_index - b.lesson_index)
      .map((l) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        video_url: l.video_url,
        payback_amount: l.payback_amount,
        _key: genKey("lesson"),
      }));

    const newQuizMap: Record<string, QuizFormItem[]> = {};
    newLessonItems.forEach((item, i) => {
      const serverLesson = result.lessons.sort(
        (a, b) => a.lesson_index - b.lesson_index,
      )[i];
      if (serverLesson?.quizzes) {
        newQuizMap[item._key] = serverLesson.quizzes
          .sort((a, b) => a.quiz_index - b.quiz_index)
          .map((q) => ({
            id: q.id,
            question: q.question,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_option: q.correct_option,
            quiz_index: q.quiz_index,
            _key: genKey("quiz"),
          }));
      }
    });

    setLessonItems(newLessonItems);
    setQuizMap(newQuizMap);
  }

  // --- Save (create or update) ---
  async function handleSave() {
    if (!user) return;
    if (!courseTitle.trim() || !courseDescription.trim()) {
      toast.error("Course title and description are required.");
      return;
    }

    setSaving(true);
    try {
      const lessons: LessonUpsert[] = lessonItems.map((l, i) => {
        const lessonQuizzes = quizMap[l._key] ?? [];
        const quizzes: QuizUpsert[] = lessonQuizzes.map((q, qi) => ({
          id: q.id,
          question: q.question,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option,
          quiz_index: qi,
        }));
        return {
          id: l.id,
          title: l.title,
          description: l.description,
          video_url: l.video_url,
          payback_amount: l.payback_amount,
          lesson_index: i,
          quizzes,
        };
      });

      if (editingCourseId) {
        // Update existing course
        const updateData: CourseUpdate = {
          title: courseTitle.trim(),
          description: courseDescription.trim(),
          price: coursePrice,
          lessons,
        };
        const result = await coursesApi.update(editingCourseId, updateData);
        // Refresh local state with server-assigned IDs
        _refreshFromResponse(result);
        toast.success("Course updated!");
      } else {
        // Create new course (author_id inferred from JWT)
        const createData: CourseCreate = {
          title: courseTitle.trim(),
          description: courseDescription.trim(),
          price: coursePrice,
          lessons,
        };
        const result = await coursesApi.create(createData);
        // Switch to edit mode and refresh local state with server-assigned IDs
        setEditingCourseId(result.id);
        _refreshFromResponse(result);
        toast.success("Course created!");
      }

      // Stay in editor (don't go back to list) so user can continue editing
      await loadCourses();
    } catch {
      toast.error("Failed to save course.");
    } finally {
      setSaving(false);
    }
  }

  // --- Delete course ---
  async function handleDeleteCourse(id: string) {
    try {
      await coursesApi.delete(id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      toast.success("Course deleted.");
    } catch {
      toast.error("Failed to delete course.");
    }
  }

  // --- AI Quiz generation (populates form state) ---
  async function handleGenerateQuiz(
    lessonKey: string,
    lessonId: string | null,
  ) {
    const lesson = lessonItems.find((l) => l._key === lessonKey);
    if (!lesson) return;

    setGeneratingQuiz(lessonKey); // Use lessonKey instead of lessonId for loading state

    try {
      type GeneratedQuiz = {
        id?: string | null;
        question: string;
        option_a: string;
        option_b: string;
        option_c: string;
        option_d: string;
        correct_option: number;
        quiz_index?: number;
      };

      let generated: GeneratedQuiz[];

      if (lessonId) {
        // For saved lessons, use the existing API
        generated = await quizzesApi.generate(lessonId, {
          num_questions: 3,
        });
      } else {
        // For unsaved lessons, use the new API with lesson data
        const quizData = await quizzesApi.generateFromData({
          title: lesson.title,
          description: lesson.description,
          video_url: lesson.video_url || null,
          num_questions: 3,
        });

        // Convert quiz data to the expected format (without IDs for unsaved)
        generated = quizData.map((q, i) => ({
          id: null, // No ID for unsaved quizzes
          question: q.question,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option,
          quiz_index: i,
        }));
      }

      // Map generated quizzes into form items
      const existingCount = (quizMap[lessonKey] ?? []).length;
      const newItems: any[] = generated.map((q, i) => ({
        id: q.id, // Will be null for unsaved lessons
        question: q.question,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: q.correct_option,
        quiz_index: q.quiz_index ?? existingCount + i,
        _key: genKey("quiz"),
      }));

      setQuizMap((prev) => ({
        ...prev,
        [lessonKey]: [...(prev[lessonKey] ?? []), ...newItems],
      }));

      // Auto-open the quiz section
      setOpenQuizSections((prev) => new Set(prev).add(lessonKey));
      toast.success(`Generated ${generated.length} quiz questions!`);
    } catch {
      toast.error("Failed to generate quizzes. AI may be unavailable.");
    } finally {
      setGeneratingQuiz(null);
    }
  }

  // --- Auth guard render ---
  if (!user || user.role !== "Teacher") return null;

  // =========================================================================
  // EDITOR VIEW
  // =========================================================================
  if (view === "editor") {
    const isNew = !editingCourseId;
    const canSave =
      courseTitle.trim().length > 0 &&
      courseDescription.trim().length > 0 &&
      lessonItems.every(
        (l) =>
          l.title.trim().length > 0 &&
          l.description.trim().length > 0 &&
          l.video_url.trim().length > 0,
      );

    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <BlurFade delay={0.1}>
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={closeEditor}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {isNew ? "Create Course" : "Edit Course"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isNew
                    ? "Set up your course and add lessons."
                    : "Update your course details and lessons."}
                </p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={!canSave || saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Course"}
            </Button>
          </div>
        </BlurFade>

        {/* Course fields */}
        <BlurFade delay={0.15}>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Course Details
              </CardTitle>
              <CardDescription>
                Basic information about your course.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="course-title">Title</Label>
                <Input
                  id="course-title"
                  placeholder="Introduction to Web Development"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-description">Description</Label>
                <TipTapEditor
                  value={courseDescription}
                  onChange={setCourseDescription}
                  placeholder="A comprehensive course on..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-price">Price (PAS)</Label>
                <Input
                  id="course-price"
                  type="number"
                  min={0}
                  step={0.1}
                  value={coursePrice}
                  onChange={(e) =>
                    setCoursePrice(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </BlurFade>

        {/* Lessons section */}
        <BlurFade delay={0.2}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Lessons</h2>
              <p className="text-sm text-muted-foreground">
                {lessonItems.length === 0
                  ? "Add lessons to your course."
                  : `${lessonItems.length} lesson${lessonItems.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <Button variant="outline" className="gap-2" onClick={addLesson}>
              <Plus className="h-4 w-4" />
              Add Lesson
            </Button>
          </div>
        </BlurFade>

        {lessonItems.length === 0 ? (
          <BlurFade delay={0.25}>
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Video className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No lessons yet. Click &quot;Add Lesson&quot; to get started.
                </p>
              </CardContent>
            </Card>
          </BlurFade>
        ) : (
          <div className="space-y-4">
            {lessonItems.map((lesson, index) => {
              const lessonQuizzes = quizMap[lesson._key] ?? [];
              const quizCount = lessonQuizzes.length;
              const isQuizOpen = openQuizSections.has(lesson._key);

              return (
                <BlurFade key={lesson._key} delay={0.05 + index * 0.02}>
                  <Card>
                    <CardContent className="p-5">
                      {/* Lesson header with index, reorder, and actions */}
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary"
                          >
                            Lesson {index + 1}
                          </Badge>
                          {lesson.id && (
                            <Badge variant="outline" className="text-xs">
                              Saved
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Reorder buttons */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={index === 0}
                            onClick={() => moveLessonUp(index)}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={index === lessonItems.length - 1}
                            onClick={() => moveLessonDown(index)}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Separator
                            orientation="vertical"
                            className="mx-1 h-6"
                          />
                          {/* AI quiz generation - available for all lessons */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            disabled={
                              generatingQuiz === lesson._key ||
                              !lesson.title.trim() ||
                              !lesson.description.trim()
                            }
                            onClick={() =>
                              handleGenerateQuiz(lesson._key, lesson.id)
                            }
                          >
                            {generatingQuiz === lesson._key ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                            AI Quiz
                          </Button>
                          {/* Remove */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeLesson(lesson._key)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Lesson fields */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            placeholder="Lesson title"
                            value={lesson.title}
                            onChange={(e) =>
                              updateLesson(lesson._key, "title", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>YouTube Video URL</Label>
                          <div className="space-y-1">
                            <div className="flex gap-2">
                              <Input
                                placeholder="https://youtube.com/watch?v=..."
                                value={lesson.video_url}
                                onChange={(e) =>
                                  updateLesson(
                                    lesson._key,
                                    "video_url",
                                    e.target.value,
                                  )
                                }
                                className={
                                  lesson.video_url.trim() &&
                                  !isValidYouTubeUrl(lesson.video_url)
                                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                    : lesson.video_url.trim() &&
                                        isValidYouTubeUrl(lesson.video_url)
                                      ? "border-green-300 focus:border-green-500 focus:ring-green-200"
                                      : ""
                                }
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={
                                  !lesson.video_url.trim() ||
                                  !isValidYouTubeUrl(lesson.video_url) ||
                                  autoFillingYouTube === lesson._key
                                }
                                onClick={() => autoFillFromYouTube(lesson._key)}
                                className="shrink-0"
                              >
                                {autoFillingYouTube === lesson._key
                                  ? "Auto-filling..."
                                  : "Auto-fill"}
                              </Button>
                            </div>
                            {lesson.video_url.trim() &&
                              !isValidYouTubeUrl(lesson.video_url) && (
                                <p className="text-xs text-red-600">
                                  Please enter a valid YouTube URL
                                </p>
                              )}
                            {lesson.video_url.trim() &&
                              isValidYouTubeUrl(lesson.video_url) && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-green-600">
                                    ✓ Valid YouTube URL
                                  </span>
                                  {!lesson.title.trim() ||
                                  !lesson.description.trim() ? (
                                    <span className="text-blue-600">
                                      Click &quot;Auto-fill&quot; to populate
                                      title and description
                                    </span>
                                  ) : null}
                                </div>
                              )}
                          </div>
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Description</Label>
                          <TipTapEditor
                            value={lesson.description}
                            onChange={(html) =>
                              updateLesson(lesson._key, "description", html)
                            }
                            placeholder="What students will learn..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Reward Amount (PAS)</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.1}
                            value={lesson.payback_amount}
                            onChange={(e) =>
                              updateLesson(
                                lesson._key,
                                "payback_amount",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                          />
                        </div>
                      </div>

                      {/* Quiz section (collapsible, for all lessons) */}
                      <>
                        <Separator className="my-4" />
                        <Collapsible
                          open={isQuizOpen}
                          onOpenChange={() => toggleQuizSection(lesson._key)}
                        >
                          <div className="flex items-center justify-between">
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2 px-2"
                              >
                                {isQuizOpen ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <CircleHelp className="h-4 w-4 text-primary" />
                                Quiz Questions
                                {quizCount > 0 && (
                                  <Badge variant="secondary" className="ml-1">
                                    {quizCount}
                                  </Badge>
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => addQuiz(lesson._key)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Question
                            </Button>
                          </div>

                          <CollapsibleContent className="mt-3 space-y-3">
                            {quizCount === 0 ? (
                              <div className="rounded-lg border border-dashed p-6 text-center">
                                <CircleHelp className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">
                                  No quiz questions yet. Add one manually or use
                                  AI to generate them.
                                </p>
                              </div>
                            ) : (
                              lessonQuizzes.map((quiz, qi) => (
                                <QuizEditor
                                  key={quiz._key}
                                  quiz={quiz}
                                  index={qi}
                                  lessonKey={lesson._key}
                                  onFieldChange={updateQuizField}
                                  onRemove={removeQuizFromState}
                                />
                              ))
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      </>
                    </CardContent>
                  </Card>
                </BlurFade>
              );
            })}
          </div>
        )}

        {/* Bottom save button */}
        {lessonItems.length > 0 && (
          <BlurFade delay={0.3}>
            <div className="mt-8 flex justify-end">
              <Button
                onClick={handleSave}
                disabled={!canSave || saving}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Saving..." : "Save Course"}
              </Button>
            </div>
          </BlurFade>
        )}
      </div>
    );
  }

  // =========================================================================
  // COURSE LIST VIEW (default)
  // =========================================================================
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <BlurFade delay={0.1}>
            <h1 className="text-3xl font-bold tracking-tight">
              <TextAnimate animation="blurInUp" by="word">
                Teacher Dashboard
              </TextAnimate>
            </h1>
          </BlurFade>
          <BlurFade delay={0.2}>
            <p className="mt-2 text-muted-foreground">
              Welcome back, {user.display_name}. Manage your courses and
              lessons.
            </p>
          </BlurFade>
        </div>
        <BlurFade delay={0.15}>
          <Button className="gap-2" onClick={openCreateEditor}>
            <Plus className="h-4 w-4" />
            New Course
          </Button>
        </BlurFade>
      </div>

      {/* Course grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <GraduationCap className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">No courses yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first course to get started.
            </p>
            <Button className="mt-6 gap-2" onClick={openCreateEditor}>
              <Plus className="h-4 w-4" />
              Create Course
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, i) => (
            <BlurFade key={course.id} delay={0.05 + i * 0.03}>
              <MagicCard
                className="h-full cursor-pointer p-0"
                gradientColor={
                  theme === "dark"
                    ? "rgba(230, 0, 122, 0.08)"
                    : "rgba(230, 0, 122, 0.05)"
                }
              >
                <div
                  className="flex h-full flex-col p-5"
                  onClick={() => openEditEditor(course)}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className="gap-1.5 bg-primary/10 text-primary"
                    >
                      <Coins className="h-3 w-3" />
                      {course.price} PAS
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCourse(course.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <h3 className="mb-1 font-bold line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="flex-1 text-sm text-muted-foreground line-clamp-2">
                    {stripHtml(course.description)}
                  </p>
                  <Separator className="my-3" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Video className="h-4 w-4" />
                    Click to edit course &amp; lessons
                  </div>
                </div>
              </MagicCard>
            </BlurFade>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Quiz Editor sub-component
// ===========================================================================

function QuizEditor({
  quiz,
  index,
  lessonKey,
  onFieldChange,
  onRemove,
}: {
  quiz: QuizFormItem;
  index: number;
  lessonKey: string;
  onFieldChange: (
    lessonKey: string,
    quizKey: string,
    field: keyof QuizFormItem,
    value: string | number,
  ) => void;
  onRemove: (lessonKey: string, quizKey: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      {/* Quiz header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Q{index + 1}
          </Badge>
          {quiz.id && (
            <Badge
              variant="secondary"
              className="text-xs bg-green-500/10 text-green-700 dark:text-green-400"
            >
              Saved
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onRemove(lessonKey, quiz._key)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Question */}
      <div className="mb-3 space-y-2">
        <Label className="text-xs">Question</Label>
        <Input
          placeholder="Enter quiz question..."
          value={quiz.question}
          onChange={(e) =>
            onFieldChange(lessonKey, quiz._key, "question", e.target.value)
          }
        />
      </div>

      {/* Options grid */}
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        {(["option_a", "option_b", "option_c", "option_d"] as const).map(
          (field, i) => (
            <div key={field} className="space-y-1">
              <Label className="text-xs">Option {OPTION_LABELS[i + 1]}</Label>
              <Input
                placeholder={`Option ${OPTION_LABELS[i + 1]}`}
                value={quiz[field]}
                onChange={(e) =>
                  onFieldChange(lessonKey, quiz._key, field, e.target.value)
                }
              />
            </div>
          ),
        )}
      </div>

      {/* Correct answer */}
      <div className="space-y-1">
        <Label className="text-xs">Correct Answer</Label>
        <Select
          value={String(quiz.correct_option)}
          onValueChange={(val) =>
            onFieldChange(
              lessonKey,
              quiz._key,
              "correct_option",
              parseInt(val, 10),
            )
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">A</SelectItem>
            <SelectItem value="2">B</SelectItem>
            <SelectItem value="3">C</SelectItem>
            <SelectItem value="4">D</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
