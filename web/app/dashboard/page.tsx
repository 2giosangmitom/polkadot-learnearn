"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  coursesApi,
  lessonsApi,
  quizzesApi,
  type Course,
  type Lesson,
} from "@/lib/api";
import { useUserStore } from "@/lib/user-store";
import { BlurFade } from "@/components/ui/blur-fade";
import { TextAnimate } from "@/components/ui/text-animate";
import { MagicCard } from "@/components/ui/magic-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Coins,
  GraduationCap,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

export default function DashboardPage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const { theme } = useTheme();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Create course form
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    price: 0,
  });
  const [creating, setCreating] = useState(false);

  // Selected course for lesson management
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  // Create lesson form
  const [showCreateLesson, setShowCreateLesson] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    video_url: "",
    payback_amount: 0,
  });
  const [creatingLesson, setCreatingLesson] = useState(false);

  // AI quiz gen
  const [generatingQuiz, setGeneratingQuiz] = useState<string | null>(null);

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
  }, [user, router]);

  async function loadCourses() {
    try {
      const all = await coursesApi.list();
      setCourses(all.filter((c) => c.author_id === user?.id));
    } catch {
      toast.error("Failed to load courses.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCourse() {
    if (!user) return;
    setCreating(true);
    try {
      const course = await coursesApi.create({
        ...courseForm,
        author_id: user.id,
      });
      setCourses((prev) => [course, ...prev]);
      setShowCreateCourse(false);
      setCourseForm({ title: "", description: "", price: 0 });
      toast.success("Course created!");
    } catch {
      toast.error("Failed to create course.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteCourse(id: string) {
    try {
      await coursesApi.delete(id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      if (selectedCourse?.id === id) {
        setSelectedCourse(null);
        setLessons([]);
      }
      toast.success("Course deleted.");
    } catch {
      toast.error("Failed to delete course.");
    }
  }

  async function selectCourse(course: Course) {
    setSelectedCourse(course);
    setLessonsLoading(true);
    try {
      setLessons(await lessonsApi.listByCourse(course.id));
    } catch {
      toast.error("Failed to load lessons.");
    } finally {
      setLessonsLoading(false);
    }
  }

  async function handleCreateLesson() {
    if (!selectedCourse) return;
    setCreatingLesson(true);
    try {
      const lesson = await lessonsApi.create(selectedCourse.id, lessonForm);
      setLessons((prev) => [...prev, lesson]);
      setShowCreateLesson(false);
      setLessonForm({ title: "", description: "", video_url: "", payback_amount: 0 });
      toast.success("Lesson created!");
    } catch {
      toast.error("Failed to create lesson.");
    } finally {
      setCreatingLesson(false);
    }
  }

  async function handleDeleteLesson(id: string) {
    try {
      await lessonsApi.delete(id);
      setLessons((prev) => prev.filter((l) => l.id !== id));
      toast.success("Lesson deleted.");
    } catch {
      toast.error("Failed to delete lesson.");
    }
  }

  async function handleGenerateQuiz(lessonId: string) {
    setGeneratingQuiz(lessonId);
    try {
      const generated = await quizzesApi.generate(lessonId, { num_questions: 3 });
      toast.success(`Generated ${generated.length} quiz questions!`);
    } catch {
      toast.error("Failed to generate quizzes. AI may be unavailable.");
    } finally {
      setGeneratingQuiz(null);
    }
  }

  if (!user || user.role !== "Teacher") return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
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
              Welcome back, {user.display_name}. Manage your courses and lessons.
            </p>
          </BlurFade>
        </div>
        <BlurFade delay={0.15}>
          <Dialog open={showCreateCourse} onOpenChange={setShowCreateCourse}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Course
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
                <DialogDescription>
                  Fill in the details for your new course.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="Introduction to Polkadot"
                    value={courseForm.title}
                    onChange={(e) =>
                      setCourseForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="A comprehensive course on..."
                    value={courseForm.description}
                    onChange={(e) =>
                      setCourseForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price (PAS)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={courseForm.price}
                    onChange={(e) =>
                      setCourseForm((f) => ({
                        ...f,
                        price: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateCourse}
                  disabled={!courseForm.title || !courseForm.description || creating}
                >
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create Course
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </BlurFade>
      </div>

      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="courses" className="gap-2">
            <BookOpen className="h-4 w-4" />
            My Courses
          </TabsTrigger>
          <TabsTrigger value="lessons" className="gap-2" disabled={!selectedCourse}>
            <Video className="h-4 w-4" />
            Lessons
          </TabsTrigger>
        </TabsList>

        {/* Courses tab */}
        <TabsContent value="courses">
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
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course, i) => (
                <BlurFade key={course.id} delay={0.05 + i * 0.03}>
                  <MagicCard
                    className="h-full p-0 cursor-pointer"
                    gradientColor={
                      theme === "dark"
                        ? "rgba(230, 0, 122, 0.08)"
                        : "rgba(230, 0, 122, 0.05)"
                    }
                  >
                    <div
                      className="flex h-full flex-col p-5"
                      onClick={() => selectCourse(course)}
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
                        {course.description}
                      </p>
                      <Separator className="my-3" />
                      <p className="text-xs text-muted-foreground">
                        Click to manage lessons
                      </p>
                    </div>
                  </MagicCard>
                </BlurFade>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Lessons tab */}
        <TabsContent value="lessons">
          {selectedCourse ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedCourse.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage lessons for this course
                  </p>
                </div>
                <Dialog open={showCreateLesson} onOpenChange={setShowCreateLesson}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Lesson
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Lesson</DialogTitle>
                      <DialogDescription>
                        Add a new video lesson to {selectedCourse.title}.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          placeholder="Lesson title"
                          value={lessonForm.title}
                          onChange={(e) =>
                            setLessonForm((f) => ({ ...f, title: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          placeholder="What students will learn..."
                          value={lessonForm.description}
                          onChange={(e) =>
                            setLessonForm((f) => ({
                              ...f,
                              description: e.target.value,
                            }))
                          }
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>YouTube Video URL</Label>
                        <Input
                          placeholder="https://youtube.com/watch?v=..."
                          value={lessonForm.video_url}
                          onChange={(e) =>
                            setLessonForm((f) => ({
                              ...f,
                              video_url: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reward Amount (PAS)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={lessonForm.payback_amount}
                          onChange={(e) =>
                            setLessonForm((f) => ({
                              ...f,
                              payback_amount: parseFloat(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleCreateLesson}
                        disabled={
                          !lessonForm.title ||
                          !lessonForm.description ||
                          !lessonForm.video_url ||
                          creatingLesson
                        }
                      >
                        {creatingLesson ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Add Lesson
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {lessonsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : lessons.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center py-12 text-center">
                    <Video className="mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      No lessons yet. Click &quot;Add Lesson&quot; to get started.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {lessons.map((lesson, i) => (
                    <BlurFade key={lesson.id} delay={0.05 + i * 0.03}>
                      <Card>
                        <CardContent className="flex items-center gap-4 p-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Video className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">
                              {lesson.title}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {lesson.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {lesson.payback_amount > 0 && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Coins className="h-3 w-3" />
                                {lesson.payback_amount} PAS
                              </Badge>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              disabled={generatingQuiz === lesson.id}
                              onClick={() => handleGenerateQuiz(lesson.id)}
                            >
                              {generatingQuiz === lesson.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5" />
                              )}
                              AI Quiz
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteLesson(lesson.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </BlurFade>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Select a course from the &quot;My Courses&quot; tab to manage its lessons.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
