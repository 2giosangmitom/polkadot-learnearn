'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Course } from '@/types/course';
import { useWallet } from '@/lib/hooks';
import { Card, Button, Badge } from '@/components/SharedUI';
import { EnrollButton } from './enroll-button';
import { BookOpen, Clock, Award } from 'lucide-react';

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { address, isConnected } = useWallet();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);

  useEffect(() => {
    async function unwrapParams() {
      const resolvedParams = await params;
      setCourseId(resolvedParams.id);
    }
    unwrapParams();
  }, [params]);

  useEffect(() => {
    if (!courseId) return;

    async function loadCourse() {
      try {
        // Fetch course details
        const courseRes = await fetch(`/api/courses/${courseId}`);
        if (!courseRes.ok) {
          console.error('Failed to load course');
          setLoading(false);
          return;
        }

        const courseData = await courseRes.json();
        setCourse(courseData.course);

        // Check if already enrolled
        if (isConnected && address) {
          const purchasesRes = await fetch(`/api/purchases?wallet_address=${encodeURIComponent(address as string)}`);
          if (purchasesRes.ok) {
            const purchasesData = await purchasesRes.json();
            const enrolled = (purchasesData.courseIds || []).includes(courseId);
            setIsEnrolled(enrolled);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to load course:', err);
        setLoading(false);
      }
    }

    loadCourse();
  }, [courseId, address, isConnected]);

  const handleEnrollSuccess = () => {
    setIsEnrolled(true);
    // Redirect to learning page
    router.push(`/student/learn/${courseId}`);
  };

  const handleStartLearning = () => {
    router.push(`/student/learn/${courseId}`);
  };

  if (loading) {
    return (
      <Layout userRole="student">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout userRole="student">
        <div className="rounded-lg border border-dashed border-neutral-700 bg-neutral-900/50 p-8 text-center text-neutral-400">
          Course not found.
        </div>
      </Layout>
    );
  }

  return (
    <Layout userRole="student">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Course Header */}
        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="text-neutral-400 hover:text-white"
          >
            ← Back to Courses
          </Button>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">
                {course.title}
              </h1>
              <p className="text-xl text-neutral-300 leading-relaxed">
                {course.description || 'No description available'}
              </p>
            </div>
          </div>
        </div>

        {/* Course Info Card */}
        <Card className="border border-neutral-800 bg-neutral-900/50">
          <div className="p-6 space-y-6">
            {/* Price & CTA */}
            <div className="flex items-center justify-between pb-6 border-b border-neutral-800">
              <div>
                <div className="text-sm text-neutral-400 mb-1">Course Price</div>
                <div className="text-3xl font-bold text-indigo-400">
                  {course.cost ? `${course.cost} PAS` : 'Free'}
                </div>
              </div>
              
              {isEnrolled ? (
                <Button
                  onClick={handleStartLearning}
                  // size=""
                  className="bg-green-600 hover:bg-green-700"
                >
                  Start Learning →
                </Button>
              ) : (
                <EnrollButton
                  courseId={courseId!}
                  courseTitle={course.title || ''}
                  cost={course.cost || 0}
                  recipientWallet={course.wallet_address || ''}
                  onEnrollSuccess={handleEnrollSuccess}
                />
              )}
            </div>

            {/* Course Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-neutral-800/50">
                <BookOpen className="w-6 h-6 mx-auto mb-2 text-indigo-400" />
                <div className="text-2xl font-bold text-white">Multiple</div>
                <div className="text-sm text-neutral-400">Lessons</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-neutral-800/50">
                <Clock className="w-6 h-6 mx-auto mb-2 text-indigo-400" />
                <div className="text-2xl font-bold text-white">Self-paced</div>
                <div className="text-sm text-neutral-400">Learning</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-neutral-800/50">
                <Award className="w-6 h-6 mx-auto mb-2 text-indigo-400" />
                <div className="text-2xl font-bold text-white">Earn Rewards</div>
                <div className="text-sm text-neutral-400">On Completion</div>
              </div>
            </div>
          </div>
        </Card>

        {/* What You'll Learn */}
        <Card className="border border-neutral-800 bg-neutral-900/50">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-4">What You'll Learn</h2>
            <div className="space-y-3 text-neutral-300">
              <div className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                </div>
                <p>Master the core concepts through AI-guided lessons</p>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                </div>
                <p>Complete milestones and earn PAS token rewards</p>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                </div>
                <p>Get personalized feedback from our AI tutor</p>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                </div>
                <p>Build practical skills with hands-on exercises</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
