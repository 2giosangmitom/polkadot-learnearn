'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CourseCard } from '@/components/course/CourseCard';
import { Layout } from '@/components/Layout';
import { Course } from '@/types/course';
import { useWallet } from '@/lib/hooks';
import { Card, Button, Badge } from '@/components/SharedUI';

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
		router.push(`/pages/student/learn/${courseId}`);
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
							onClick={() => router.push('/pages/student/course')}
							className="mx-auto"
						>
							Browse Courses
						</Button>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{enrolledCourses.map((course) => (
							<Card key={course.id} className="flex flex-col h-full border border-neutral-800 hover:border-indigo-500/50 transition-all">
								<div className="p-6 flex flex-col flex-1">
									<div className="flex items-start justify-between mb-4">
										<h3 className="text-xl font-bold text-white">{course.title}</h3>
										<Badge variant="primary">Enrolled</Badge>
									</div>
									<p className="text-neutral-400 text-sm mb-6 flex-1 line-clamp-3">
										{course.description || 'No description available'}
									</p>
									
									<div className="mt-auto space-y-3">
										<Button 
											className="w-full"
											onClick={() => handleStartCourse(course.id)}
										>
											Start Learning
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
