'use client';

import { useEffect, useState } from 'react';
import { CourseCard } from '@/components/course/CourseCard';
import { useWallet } from '@/lib/hooks/useWallet';
import { Lesson } from '@/types/course';

type CourseWithLessons = {
  id: string;
  title: string | null;
  description: string | null;
  cost: number | null;
  wallet_address?: string | null;
  created_at: string;
  update_at: string | null;
  lesson?: Lesson[];
};

export default function TeacherCoursesPage() {
  const { address, isConnected } = useWallet();
  const [courses, setCourses] = useState<CourseWithLessons[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCourseLessons, setSelectedCourseLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonError, setLessonError] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;

    async function fetchCourses(wallet: string) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/courses/teacher?wallet_address=${encodeURIComponent(wallet)}`);
        const body = await res.json();

        if (!res.ok) {
          throw new Error(body.error || 'Failed to load courses');
        }

        if (!abort) {
          setCourses(body.courses || []);
        }
      } catch (err) {
        if (!abort) {
          setError((err as Error).message);
        }
      } finally {
        if (!abort) setLoading(false);
      }
    }

    if (isConnected && address) {
      fetchCourses(address);
    } else {
      setCourses([]);
      setSelectedCourseId(null);
      setSelectedCourseLessons([]);
    }

    return () => {
      abort = true;
    };
  }, [address, isConnected]);

  return (
    <main className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.16em] text-slate-400">Teacher workspace</p>
          <h1 className="text-3xl font-bold text-slate-50">Your created courses</h1>
          <p className="text-slate-300">Connect your teacher wallet to view and drill into lessons.</p>
        </header>

        {!isConnected && (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 p-6 text-center text-slate-200">
            Please connect your teacher wallet to view created courses.
          </div>
        )}

        {isConnected && loading && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-200">Loading courses...</div>
        )}

        {isConnected && error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-900/50 p-6 text-red-100">{error}</div>
        )}

        {isConnected && !loading && !error && courses.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 p-6 text-center text-slate-200">
            You have not created any courses yet.
          </div>
        )}

        {isConnected && !loading && !error && courses.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map((course) => {
                const isSelected = selectedCourseId === course.id;
                return (
                  <button
                    key={course.id}
                    onClick={async () => {
                      if (selectedCourseId === course.id && selectedCourseLessons.length > 0) {
                        return;
                      }
                      setSelectedCourseId(course.id);
                      setLessonError(null);
                      setLoadingLessons(true);
                      try {
                        const res = await fetch(`/api/courses/${course.id}`);
                        const body = await res.json();
                        if (!res.ok) throw new Error(body.error || 'Failed to load lessons');
                        setSelectedCourseLessons(body.course?.lesson || []);
                      } catch (err) {
                        setLessonError((err as Error).message);
                        setSelectedCourseLessons([]);
                      } finally {
                        setLoadingLessons(false);
                      }
                    }}
                    className={`text-left w-full rounded-2xl transition ring-offset-2 ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-slate-950' : 'hover:ring-1 hover:ring-slate-700'}`}
                  >
                    <CourseCard course={course} />
                  </button>
                );
              })}
            </div>

            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Lessons</p>
                  <h2 className="text-lg font-semibold text-slate-50">Selected course</h2>
                </div>
                {selectedCourseId && (
                  <span className="text-xs px-2 py-1 rounded-full bg-indigo-900/50 text-indigo-100 border border-indigo-500/40">
                    {selectedCourseLessons.length} total
                  </span>
                )}
              </div>

              {!selectedCourseId && <p className="text-sm text-slate-300">Pick a course to view its lessons.</p>}
              {selectedCourseId && loadingLessons && <p className="text-sm text-slate-300">Loading lessons...</p>}
              {selectedCourseId && lessonError && (
                <p className="text-sm text-red-300">{lessonError}</p>
              )}
              {selectedCourseId && !loadingLessons && !lessonError && selectedCourseLessons.length === 0 && (
                <p className="text-sm text-slate-300">No lessons found for this course.</p>
              )}
              {selectedCourseId && !loadingLessons && !lessonError && selectedCourseLessons.length > 0 && (
                <ul className="space-y-2">
                  {selectedCourseLessons.map((lesson) => (
                    <li key={lesson.id} className="border border-slate-800 rounded-xl p-3 bg-slate-950">
                      <div className="font-semibold text-slate-50">{lesson.title || 'Lesson'}</div>
                      {lesson.description && <p className="text-sm text-slate-300 mt-1">{lesson.description}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}