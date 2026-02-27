'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Course } from '@/types/course';
import { useWallet } from '@/lib/hooks';
import { Card, Button, Badge, ProgressBar } from '@/components/SharedUI';

const getCourseProgress = (course: Course) => {
  if (!course.lessons || course.lessons.length === 0) return 0;
  try {
    const saved = localStorage.getItem(`course_progress_${course.id}`);
    const completedLessonIds = saved ? JSON.parse(saved) : [];
    return Math.round((completedLessonIds.length / course.lessons.length) * 100);
  } catch (e) {
    return 0;
  }
};

const CourseCard: React.FC<{ 
  course: Course; 
  isEnrolled: boolean;
  onPlayCourse: (id: string) => void;
  // Props not used in dashboard but kept for interface compatibility
  onBuyCourse?: (course: Course) => void;
  processingPurchase?: string | null;
}> = ({ course, isEnrolled, onPlayCourse, onBuyCourse, processingPurchase }) => {
  const progress = isEnrolled ? getCourseProgress(course) : 0;
  
  return (
    <Card className="card-hover flex flex-col h-full border border-neutral-800 hover:border-indigo-500/50 transition-all overflow-hidden group">
      <div className="h-48 w-full bg-neutral-800 relative overflow-hidden">
        {course.thumbnail_url ? (
          <img 
            src={course.thumbnail_url} 
            alt={course.title || 'Course'} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-800 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-neutral-900 to-black">
            <span className="text-neutral-500 text-4xl">🎓</span>
          </div>
        )}
        <div className="absolute top-4 right-4 flex space-x-2 z-10">
          <Badge variant="primary" className="bg-black/50 backdrop-blur-md border border-white/10">{course.lessons?.length || 0} Lessons</Badge>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent opacity-80"></div>
      </div>
      <div className="p-6 flex flex-col flex-1 relative z-10 -mt-6">
        <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{course.title}</h3>
        <p className="text-neutral-400 text-sm mb-6 flex-1 line-clamp-3">{course.description || 'No description available'}</p>
        
        <div className="mt-auto">
          {isEnrolled ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-medium text-neutral-400 mb-1.5">
                  <span>Progress</span>
                  <span className="text-indigo-400 font-bold">{progress}%</span>
                </div>
                <ProgressBar progress={progress} className="h-1.5" />
              </div>
              <Button className="w-full" onClick={() => onPlayCourse(course.id)}>
                {progress === 0 ? 'Start Course' : (progress === 100 ? 'Review Course' : 'Continue Learning')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2 border-t border-neutral-800/50 mt-4">
              <span className="font-bold text-xl text-indigo-400">{course.cost} PAS</span>
              <Button 
                onClick={() => onBuyCourse && onBuyCourse(course)}
                disabled={processingPurchase === course.id}
              >
                {processingPurchase === course.id ? 'Processing...' : 'Enroll Now'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default function StudentDashboard() {
	const router = useRouter();
	const { address, isConnected } = useWallet();
	const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!isConnected || !address) return;

		let abort = false;

		async function loadEnrolledCourses() {
			if (!address) return;
			
			try {
				// Get purchased course IDs
				const purchasesRes = await fetch(`/api/purchases?wallet_address=${encodeURIComponent(address)}`);
				const purchasesData = await purchasesRes.json();
				
				if (!purchasesRes.ok) {
					console.error('Failed to load purchases:', purchasesData.error);
					return;
				}

				const purchasedCourseIds = purchasesData.courseIds || [];

				if (purchasedCourseIds.length === 0) {
					if (!abort) {
						setEnrolledCourses([]);
						setLoading(false);
					}
					return;
				}

				// Get all courses
				const coursesRes = await fetch('/api/courses');
				const coursesData = await coursesRes.json();
				
				if (!coursesRes.ok) {
					console.error('Failed to load courses:', coursesData.error);
					return;
				}

				// Filter enrolled courses
				const allCourses = coursesData.courses || [];
				const enrolled = allCourses.filter((c: Course) => purchasedCourseIds.includes(c.id));

				if (!abort) {
					setEnrolledCourses(enrolled);
					setLoading(false);
				}
			} catch (err) {
				console.error('Failed to load enrolled courses:', err);
				if (!abort) setLoading(false);
			}
		}

		loadEnrolledCourses();

		return () => {
			abort = true;
		};
	}, [address, isConnected]);

	const handleStartCourse = (courseId: string) => {
		router.push(`/student/learn/${courseId}`);
	};

	return (
		<Layout userRole="student">
			<div className="space-y-8">
				<header className="space-y-2">
					<h1 className="text-3xl font-extrabold text-white tracking-tight">My Learning Path</h1>
					<p className="text-neutral-400 text-lg">Your enrolled courses and learning progress</p>
				</header>

				{loading ? (
					<div className="flex items-center justify-center py-12">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
					</div>
				) : enrolledCourses.length === 0 ? (
					<div className="text-center py-24 bg-neutral-900/50 rounded-2xl border border-neutral-800 border-dashed">
						<h3 className="text-xl font-bold text-white mb-2">Your journey hasn't started yet.</h3>
						<p className="text-neutral-400 mb-6">Explore the course marketplace to find your next skill.</p>
						<Button 
							onClick={() => router.push('/student/course')}
							className="mx-auto"
						>
							Browse Courses
						</Button>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{enrolledCourses.map((course) => (
							<CourseCard 
								key={course.id} 
								course={course} 
								isEnrolled={true} 
								onPlayCourse={handleStartCourse}
							/>
						))}
					</div>
				)}
			</div>
		</Layout>
	);
}
