import { Course, Lesson } from '@/types/course';
import Link from 'next/link';

interface CourseCardProps {
  course: Course & { lesson?: Lesson[] };
}

export function CourseCard({ course }: CourseCardProps) {
  const displayCost = typeof course.cost === 'number' ? course.cost : 0;
  const modulesCount = Array.isArray(course.lesson) ? course.lesson.length : 0;

  return (
    <Link href={`/courses/${course.id}`}>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-slate-700">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Course</p>
            <h3 className="text-xl font-semibold text-slate-50">{course.title || 'Untitled course'}</h3>
          </div>
          <span className="text-sm font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-100 border border-slate-700">
            {displayCost} PAS
          </span>
        </div>

        <p className="text-slate-300 mb-4 line-clamp-2">{course.description || 'No description yet.'}</p>

        <div className="flex items-center justify-between text-sm text-slate-200">
          <span className="font-medium">{modulesCount} module(s) to complete</span>
          <span className="text-slate-100 font-semibold">View details →</span>
        </div>
      </div>
    </Link>
  );
}
