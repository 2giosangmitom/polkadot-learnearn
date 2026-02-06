'use client';

import { useEffect, useMemo, useState } from 'react';
import { createCourseAction } from '@/app/teacher/create/actions';
import { useWallet } from '@/lib/hooks/useWallet';

interface LessonForm {
  title: string;
  description: string;
  videoUrl: string;
  paybackAmount: string;
}

const EMPTY_LESSON: LessonForm = {
  title: '',
  description: '',
  videoUrl: '',
  paybackAmount: '',
};

export default function CreateCourseForm() {
  const { address, isConnected } = useWallet();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [lessons, setLessons] = useState<LessonForm[]>([EMPTY_LESSON]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState<'unknown' | 'teacher' | 'student'>('unknown');
  const [checkingRole, setCheckingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setRole('unknown');
      return;
    }

    setCheckingRole(true);
    setRoleError(null);

    fetch(`/api/users?wallet_address=${address}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body.error || 'Failed to fetch user');
        }
        const userRole = body.user?.role;
        setRole(userRole === 2 ? 'teacher' : 'student');
      })
      .catch((err) => {
        console.error('Unable to verify role', err);
        setRoleError('Không thể kiểm tra vai trò giáo viên.');
      })
      .finally(() => setCheckingRole(false));
  }, [address]);

  const canSubmit = useMemo(() => isConnected && role === 'teacher', [isConnected, role]);

  const addLesson = () => {
    setLessons([...lessons, { ...EMPTY_LESSON }]);
  };

  const removeLesson = (index: number) => {
    setLessons(lessons.filter((_, i) => i !== index));
  };

  const updateLesson = (index: number, field: keyof LessonForm, value: string) => {
    const updatedLessons = [...lessons];
    updatedLessons[index] = { ...updatedLessons[index], [field]: value };
    setLessons(updatedLessons);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!address) {
        throw new Error('Vui lòng kết nối ví trước khi tạo khóa học.');
      }

      if (role !== 'teacher') {
        throw new Error('Chỉ giáo viên mới có thể tạo khóa học và bài học.');
      }

      const formData = new FormData();
      const courseData = {
        title,
        description,
        cost: cost ? parseFloat(cost) : null,
        wallet_address: address,
        lessons: lessons
          .filter((l) => l.title)
          .map((lesson) => ({
            title: lesson.title,
            description: lesson.description || null,
            video_url: lesson.videoUrl || null,
            payback_amount: lesson.paybackAmount ? parseFloat(lesson.paybackAmount) : null,
          })),
      };

      formData.append('course', JSON.stringify(courseData));
      await createCourseAction(formData);

      // Reset form
      setTitle('');
      setDescription('');
      setCost('');
      setLessons([EMPTY_LESSON]);

      alert('Course created successfully!');
    } catch (error) {
      console.error('Error creating course:', error);
      alert((error as Error).message || 'Failed to create course');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Create New Course</h1>
      <p className="text-sm text-gray-600 mb-6">
        Bạn cần kết nối ví và có vai trò giáo viên để tạo khóa học và bài học mới.
      </p>

      <div className="mb-4 text-sm text-gray-700">
        {!isConnected && (
          <div className="text-red-600 font-medium">Vui lòng kết nối ví trước khi tạo khóa học.</div>
        )}

        {isConnected && (
          <>
            <span className="font-semibold">Wallet:</span> {address}
            <div className="text-xs text-gray-500">
              {checkingRole && 'Đang kiểm tra vai trò...'}
              {!checkingRole && role === 'teacher' && 'Bạn là giáo viên, có thể tạo khóa học.'}
              {!checkingRole && role === 'student' && 'Tài khoản này chưa phải giáo viên.'}
              {roleError && roleError}
            </div>
          </>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Course Info */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Course Information</h2>
          
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Course Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Introduction to Polkadot"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe what students will learn in this course..."
            />
          </div>

          <div>
            <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-1">
              Cost (DOT) *
            </label>
            <input
              id="cost"
              type="number"
              step="0.01"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="10.00"
            />
          </div>
        </div>

        {/* Lessons */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Lessons</h2>
            <button
              type="button"
              onClick={addLesson}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Lesson
            </button>
          </div>

          <div className="space-y-6">
            {lessons.map((lesson, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-gray-700">Lesson {index + 1}</h3>
                  {lessons.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLesson(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    value={lesson.title}
                    onChange={(e) => updateLesson(index, 'title', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter lesson title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson Content *
                  </label>
                  <textarea
                    value={lesson.description}
                    onChange={(e) => updateLesson(index, 'description', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter lesson description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Video URL
                    </label>
                    <input
                      type="url"
                      value={lesson.videoUrl}
                      onChange={(e) => updateLesson(index, 'videoUrl', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payback Amount (PAS)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={lesson.paybackAmount}
                      onChange={(e) => updateLesson(index, 'paybackAmount', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.5"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => {
              if (confirm('Are you sure you want to cancel? All changes will be lost.')) {
                setTitle('');
                setDescription('');
                setCost('');
                setLessons([EMPTY_LESSON]);
              }
            }}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !canSubmit}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Course'}
          </button>
        </div>
      </form>
    </div>
  );
}
