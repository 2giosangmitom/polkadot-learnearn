'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Button, Badge } from '@/components/SharedUI';
import { PencilIcon } from '@/components/Icons';
import { useWallet } from '@/lib/hooks/useWallet';
import { Lesson } from '@/types/course';

type CourseWithLessons = {
  id: string;
  title: string | null;
  description: string | null;
  cost: number | null;
  wallet_address?: string | null;
  thumbnail_url?: string | null;
  created_at: string;
  update_at: string | null;
  lesson?: Lesson[];
};

export default function TeacherCoursesPage() {
  const router = useRouter();
  const { address, isConnected } = useWallet();
  const [courses, setCourses] = useState<CourseWithLessons[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    }

    return () => {
      abort = true;
    };
  }, [address, isConnected]);

  const handleCreateCourse = () => {
    router.push('/pages/teacher/create');
  };

  const handleEditCourse = (courseId: string) => {
    router.push(`/pages/teacher/create?id=${courseId}`);
  };

  return (
    <Layout userRole="teacher">
      <div className="anim-fade-in-up">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Teacher Workspace</h1>
            <p className="text-neutral-400 mt-2 text-lg">Manage your curriculum and empower the next generation.</p>
          </div>
          {isConnected && (
            <Button onClick={handleCreateCourse} className="flex items-center py-2.5 px-5">
              <span className="mr-2 text-xl leading-none font-light">+</span> Create New Course
            </Button>
          )}
        </div>

        {!isConnected && (
          <div className="text-center py-24 bg-neutral-900/50 rounded-2xl border border-neutral-800 border-dashed">
            <h3 className="text-xl font-bold text-white mb-2">Connect your wallet</h3>
            <p className="text-neutral-400 mb-8">Please connect your teacher wallet to view and manage your courses.</p>
          </div>
        )}

        {isConnected && loading && (
          <div className="text-center py-24 bg-neutral-900/50 rounded-2xl border border-neutral-800">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="text-neutral-400 mt-4">Loading your courses...</p>
          </div>
        )}

        {isConnected && error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-900/50 p-6 text-red-100">
            <h3 className="font-bold mb-2">Error loading courses</h3>
            <p>{error}</p>
          </div>
        )}

        {isConnected && !loading && !error && courses.length === 0 && (
          <div className="text-center py-24 bg-neutral-900/50 rounded-2xl border border-neutral-800 border-dashed">
            <h3 className="text-xl font-bold text-white mb-2">Your workspace is empty.</h3>
            <p className="text-neutral-400 mb-8">Start sharing your Web3 knowledge today to earn and build your reputation.</p>
            <Button onClick={handleCreateCourse} className="px-6 py-3">Create Your First Course</Button>
          </div>
        )}

        {isConnected && !loading && !error && courses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="card-hover flex flex-col sm:flex-row overflow-hidden">
                <div className="w-full sm:w-48 h-48 sm:h-auto bg-neutral-800 flex-shrink-0 relative">
                  {course.thumbnail_url ? (
                    <img 
                      src={course.thumbnail_url} 
                      alt={course.title || 'Course thumbnail'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900 ${course.thumbnail_url ? 'hidden absolute inset-0' : ''}`}>
                    <div className="text-6xl opacity-20">📚</div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-900 hidden sm:block pointer-events-none"></div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between relative z-10 bg-neutral-900">
                  <div>
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <h3 className="text-xl font-bold text-white line-clamp-1">{course.title || 'Untitled Course'}</h3>
                      <Badge variant="primary">{course.cost || 0} PAS</Badge>
                    </div>
                    <p className="text-sm text-neutral-400 line-clamp-2 mb-4 leading-relaxed">
                      {course.description || 'No description available'}
                    </p>
                    <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider flex items-center space-x-2">
                      <span className="bg-neutral-800 px-2 py-1 rounded">
                        {course.lesson?.length || 0} Lessons
                      </span>
                    </div>
                  </div>
                  <div className="mt-6 flex space-x-3 pt-4 border-t border-neutral-800">
                    <Button 
                      variant="outline" 
                      className="text-sm py-2 px-4 flex items-center w-full sm:w-auto"
                      onClick={() => handleEditCourse(course.id)}
                    >
                      <PencilIcon className="w-4 h-4 mr-2" /> Edit Curriculum
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}