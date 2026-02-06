import { getCourses } from '@/lib/courses';
import { CourseCard } from '@/components/course/CourseCard';

export default async function CoursesPage() {
	const courses = await getCourses();

	return (
		<main className="min-h-screen bg-background p-8">
			<div className="max-w-6xl mx-auto space-y-8">
				<header className="space-y-2">
					<h1 className="text-3xl font-bold text-primary">Tất cả khóa học</h1>
					<p className="text-muted-foreground">Xem giá và số module cần hoàn thành cho mỗi khóa học.</p>
				</header>

				{courses.length === 0 ? (
					<div className="rounded-lg border border-dashed p-8 text-center text-gray-600">
						Chưa có khóa học nào. Hãy trở thành giáo viên và đăng khóa học mới.
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{courses.map((course) => (
							<CourseCard key={course.id} course={course} />
						))}
					</div>
				)}
			</div>
		</main>
	);
}
