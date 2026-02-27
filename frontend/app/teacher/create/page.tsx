'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createCourseAction, updateCourseAction } from './actions';
import { Layout } from '@/components/Layout';
import { Card, Button, Input, Textarea, Label } from '@/components/SharedUI';
import { PlusIcon, TrashIcon } from '@/components/Icons';
import { useWallet } from '@/lib/hooks/useWallet';
import Modal, { useModal } from '@/components/Modal';

interface LessonForm {
  id?: string;
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

export default function TeacherCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('id');
  const isEditMode = !!courseId;

  const { address, isConnected } = useWallet();
  const { modalState, showModal, hideModal } = useModal();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [lessons, setLessons] = useState<LessonForm[]>([EMPTY_LESSON]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<'unknown' | 'teacher' | 'student'>('unknown');
  const [checkingRole, setCheckingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Check user role
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
        setRoleError('Unable to verify teacher role.');
      })
      .finally(() => setCheckingRole(false));
  }, [address]);

  // Load course data if in edit mode
  useEffect(() => {
    if (!courseId || !isConnected) return;

    setIsLoading(true);
    fetch(`/api/courses/${courseId}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load course');

        const course = body.courses;
        setTitle(course.title || '');
        setDescription(course.description || '');
        setCost(course.cost?.toString() || '');
        setThumbnailUrl(course.thumbnail_url || '');

        if (course.lesson && course.lesson.length > 0) {
          // Sort lessons by created_at to maintain proper order
          const sortedLessons = [...course.lesson].sort((a: any, b: any) => {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });

          setLessons(
            sortedLessons.map((l: any) => ({
              id: l.id,
              title: l.title || '',
              description: l.description || '',
              videoUrl: l.video_url || '',
              paybackAmount: l.payback_amount?.toString() || '',
            }))
          );
        } else {
          setLessons([EMPTY_LESSON]);
        }
      })
      .catch((err) => {
        console.error('Error loading course:', err);
        showModal('Unable to load course data', {
          type: 'error',
          title: 'Error'
        });
      })
      .finally(() => setIsLoading(false));
  }, [courseId, isConnected, showModal]);

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!title || parseFloat(cost) < 0) {
      showModal('Please fill in all required fields (Title, Valid Price)', {
        type: 'error',
        title: 'Missing Information'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (!address) {
        throw new Error('Please connect wallet before creating a course.');
      }

      if (role !== 'teacher') {
        throw new Error('Only teachers can create/edit courses.');
      }

      const formData = new FormData();
      const courseData = {
        title,
        description,
        cost: cost ? parseFloat(cost) : null,
        thumbnail_url: thumbnailUrl || null,
        wallet_address: address,
        lessons: lessons
          .filter((l) => l.title)
          .map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description || null,
            video_url: lesson.videoUrl || null,
            payback_amount: lesson.paybackAmount ? parseFloat(lesson.paybackAmount) : null,
          })),
      };

      formData.append('course', JSON.stringify(courseData));

      if (isEditMode && courseId) {
        await updateCourseAction(courseId, formData);
        showModal('Course updated successfully!', {
          type: 'success',
          title: 'Success',
          onConfirm: () => {
            router.push('/teacher/courses');
          }
        });
      } else {
        await createCourseAction(formData);
        showModal('Course created successfully!', {
          type: 'success',
          title: 'Success',
          onConfirm: () => {
            router.push('/teacher/courses');
          }
        });
      }
    } catch (error) {
      console.error('Error saving course:', error);
      showModal((error as Error).message || 'Unable to save course', {
        type: 'error',
        title: 'Error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    showModal('Are you sure you want to cancel? All unsaved changes will be lost.', {
      type: 'warning',
      title: 'Confirm',
      showCancel: true,
      confirmText: 'Discard',
      cancelText: 'Go Back',
      onConfirm: () => {
        router.push('/teacher/courses');
      }
    });
  };

  if (isLoading) {
    return (
      <Layout userRole="teacher">
        <div className="max-w-4xl mx-auto py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-neutral-400 mt-4">Loading course data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userRole="teacher">
      <div className="max-w-4xl mx-auto pb-20 anim-fade-in-up">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-800">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {isEditMode ? 'Edit Curriculum' : 'Design New Course'}
          </h1>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleCancel}>Discard</Button>
            <Button onClick={() => handleSubmit()} disabled={!canSubmit || isSubmitting} className="px-6">
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update Course' : 'Publish Course'}
            </Button>
          </div>
        </div>

        {/* Warning messages */}
        {!isConnected && (
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-600/30 rounded-xl text-amber-300">
            <p className="font-medium">⚠️ Please connect wallet to continue</p>
          </div>
        )}

        {isConnected && checkingRole && (
          <div className="mb-6 p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl text-neutral-400">
            <p>Checking role...</p>
          </div>
        )}

        {isConnected && !checkingRole && role === 'student' && (
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-600/30 rounded-xl text-amber-300">
            <p className="font-medium">⚠️ This account is not a teacher</p>
          </div>
        )}

        {roleError && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-600/30 rounded-xl text-red-300">
            <p>{roleError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Course Details */}
          <Card className="p-8">
            <h2 className="text-xl font-bold text-white mb-6 border-b border-neutral-800 pb-3 flex items-center">
              <span className="w-6 h-6 rounded-full bg-indigo-900/50 text-indigo-400 flex items-center justify-center text-xs mr-3">1</span>
              Course Metadata
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Label>Course Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Advanced Polkadot Development"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label>Description *</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will students learn in this course?"
                  rows={3}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label>Enrollment Fee (PAS Tokens) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="10.00"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label>Course Thumbnail URL (Optional)</Label>
                <Input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-neutral-500 mt-1">Recommended: 800x400px image</p>
              </div>
            </div>
          </Card>

          {/* Lessons */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center">
                <span className="w-6 h-6 rounded-full bg-indigo-900/50 text-indigo-400 flex items-center justify-center text-xs mr-3">2</span>
                Course Modules ({lessons.length})
              </h2>
              <Button variant="outline" type="button" onClick={addLesson} className="flex items-center text-sm py-2 px-4">
                <PlusIcon className="w-4 h-4 mr-2" /> Add New Module
              </Button>
            </div>

            <div className="space-y-6">
              {lessons.length === 0 && (
                <div className="text-center py-16 bg-neutral-900/50 rounded-2xl border border-neutral-800 border-dashed text-neutral-500">
                  No modules added yet. Click "Add New Module" to structure your course.
                </div>
              )}

              {lessons.map((lesson, idx) => (
                <Card key={idx} className="p-8 border-l-4 border-l-indigo-500 bg-neutral-900 overflow-visible relative">
                  <div className="absolute top-0 right-0 p-4">
                    <button
                      type="button"
                      onClick={() => removeLesson(idx)}
                      className="icon-hover-red text-neutral-500 bg-neutral-800 p-2 rounded-lg"
                      title="Remove Lesson"
                      disabled={lessons.length === 1}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>

                  <h3 className="font-bold text-indigo-400 mb-6 text-sm uppercase tracking-wider">Module {idx + 1}</h3>

                  <div className="grid grid-cols-1 gap-6 mb-6 pr-12">
                    <div>
                      <Label>Module Title *</Label>
                      <Input
                        value={lesson.title}
                        onChange={(e) => updateLesson(idx, 'title', e.target.value)}
                        placeholder="Enter lesson title"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <Label>Lesson Content / Description *</Label>
                    <Textarea
                      value={lesson.description}
                      onChange={(e) => updateLesson(idx, 'description', e.target.value)}
                      rows={6}
                      placeholder="Write your comprehensive lesson content here..."
                      className="font-mono text-sm text-neutral-300"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label>Video URL (Optional)</Label>
                      <Input
                        type="url"
                        value={lesson.videoUrl}
                        onChange={(e) => updateLesson(idx, 'videoUrl', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <Label>Payback Amount (PAS)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={lesson.paybackAmount}
                          onChange={(e) => updateLesson(idx, 'paybackAmount', e.target.value)}
                          placeholder="0.5"
                          className="pr-12"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-neutral-500 text-sm font-medium">PAS</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </form>
      </div>

      <Modal
        isOpen={modalState.isOpen}
        onClose={hideModal}
        message={modalState.message}
        title={modalState.title}
        type={modalState.type}
        confirmText={modalState.confirmText}
        showCancel={modalState.showCancel}
        cancelText={modalState.cancelText}
        onConfirm={modalState.onConfirm}
      />
    </Layout>
  );
}