'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Card, Button, Badge, ProgressBar } from '@/components/SharedUI';
import { useWallet } from '@/lib/hooks';
import Modal, { useModal } from '@/components/Modal';
import { Course, Lesson } from '@/types/course';
import { 
  BookOpenIcon, 
  AcademicCapIcon, 
  CoinIcon, 
  CheckCircleIcon, 
  PlayCircleIcon, 
  DocumentTextIcon,
  XCircleIcon
} from '@/components/Icons';

// Helper function to detect if URL is a YouTube link
function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

// Helper function to convert YouTube watch URL to embed URL
function getYouTubeEmbedUrl(url: string): string {
  try {
    // Handle youtube.com/watch?v=ID format
    if (url.includes('youtube.com/watch')) {
      const urlObj = new URL(url);
      const videoId = urlObj.searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    // Handle youtu.be/ID format
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // If already an embed URL, return as is
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
  } catch (e) {
    console.error('Failed to parse YouTube URL:', e);
  }
  return url;
}

export default function StudentLearnPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { address, isConnected } = useWallet();

  const [course, setCourse] = useState<Course | null>(null);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarned, setTotalEarned] = useState(0);
  const { modalState, showModal, hideModal } = useModal();
  
  // Test Mode State
  const [viewMode, setViewMode] = useState<'content' | 'test'>('content');
  const [answer, setAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<{ pass: boolean; feedback: string } | null>(null);

  const activeLesson = course?.lessons?.[activeLessonIdx] || null;
  const isLessonCompleted = activeLesson ? completedLessonIds.includes(activeLesson.id) : false;

  // Reset view when lesson changes
  useEffect(() => {
    setViewMode('content');
    setAnswer('');
    setEvalResult(null);
  }, [activeLessonIdx]);

  // Calculate Progress
  const completedCount = course?.lessons 
    ? course.lessons.filter(l => completedLessonIds.includes(l.id)).length 
    : 0;
  const courseProgress = course?.lessons 
    ? Math.round((completedCount / course.lessons.length) * 100) 
    : 0;

  // Load course and lessons
  useEffect(() => {
    if (!courseId) return;

    async function loadCourse() {
      try {
        const res = await fetch(`/api/courses/${courseId}`);
        if (!res.ok) {
          throw new Error('Failed to load course');
        }

        const data = await res.json();
        const courseData = data.courses;
        
        if (courseData) {
          setCourse(courseData);
          setActiveLessonIdx(0);
        }
      } catch (error) {
        console.error('Error loading course:', error);
        showModal('Unable to load course. Please try again.', {
          type: 'error',
          title: 'Error',
          onConfirm: () => router.push('/student/dashboard')
        });
      } finally {
        setLoading(false);
      }
    }

    loadCourse();

    // Load completed lessons from localStorage
    const savedProgress = localStorage.getItem(`course_progress_${courseId}`);
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress);
        setCompletedLessonIds(progress.completedLessonIds || []);
        setTotalEarned(progress.totalEarned || 0);
      } catch (e) {
        console.error('Failed to parse saved progress:', e);
      }
    }
  }, [courseId, router, showModal]);

  // Check if user has purchased the course
  useEffect(() => {
    if (!isConnected || !address || !courseId) return;

    async function checkEnrollment() {
      try {
        const res = await fetch(`/api/purchases?wallet_address=${encodeURIComponent(address as string)}`);
        if (res.ok) {
          const data = await res.json();
          const isPurchased = data.courseIds?.includes(courseId);
          
          if (!isPurchased) {
            showModal('You have not enrolled in this course.', {
              type: 'warning',
              title: 'Not Enrolled',
              onConfirm: () => router.push(`/student/course/${courseId}`)
            });
          }
        }
      } catch (error) {
        console.error('Error checking enrollment:', error);
      }
    }

    checkEnrollment();
  }, [address, isConnected, courseId, router, showModal]);

  const handleSelectLesson = (idx: number) => {
    setActiveLessonIdx(idx);
  };

  const handleSubmitMilestone = async () => {
    if (!activeLesson || !answer.trim()) return;

    setIsEvaluating(true);
    setEvalResult(null);

    // If milestone missing, create a temporary one
    const milestone = activeLesson.milestone || {
        question: `What is the main takeaway from "${activeLesson.title}"?`,
        expectedCriteria: "Demonstrate understanding of the core concept."
    };

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestone: {
            question: milestone.question,
            expectedCriteria: milestone.expectedCriteria
          },
          answer
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Evaluation failed');

      setEvalResult(data);
      
      if (data.pass) {
        handleCompleteLesson(true); // Complete silently
      }
    } catch (error) {
      console.error('Error evaluating answer:', error);
      showModal('Failed to evaluate answer. Please try again.', {
          type: 'error',
          title: 'Error'
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleCompleteLesson = (silent = false) => {
    if (!activeLesson || isLessonCompleted) return;

    // Add to completed lessons
    const newCompletedIds = [...completedLessonIds, activeLesson.id];
    setCompletedLessonIds(newCompletedIds);

    // Calculate reward
    const reward = activeLesson.payback_amount || 0;
    const newTotalEarned = totalEarned + reward;
    setTotalEarned(newTotalEarned);

    // Save progress to localStorage
    const progress = {
      completedLessonIds: newCompletedIds,
      totalEarned: newTotalEarned,
    };
    localStorage.setItem(`course_progress_${courseId}`, JSON.stringify(progress));

    // Show completion message only if not silent
    if (!silent) {
      if (reward > 0) {
        showModal(
          `Congratulations! You completed the lesson and earned ${reward} PAS.`,
          {
            type: 'success',
            title: 'Lesson Completed!',
            onConfirm: () => {
              if (activeLessonIdx < (course?.lessons?.length || 0) - 1) {
                setActiveLessonIdx(activeLessonIdx + 1);
              }
            }
          }
        );
      } else {
        showModal('Congratulations! You completed the lesson.', {
          type: 'success',
          title: 'Lesson Completed!',
          onConfirm: () => {
            if (activeLessonIdx < (course?.lessons?.length || 0) - 1) {
              setActiveLessonIdx(activeLessonIdx + 1);
            }
          }
        });
      }
    }
  };

  const handleNextLesson = () => {
    if (!course?.lessons) return;
    
    if (activeLessonIdx < course.lessons.length - 1) {
      setActiveLessonIdx(activeLessonIdx + 1);
    }
  };

  const handleCompleteAndNext = () => {
    if (!activeLesson) return;
    
    // If not completed, go to test view to earn completion
    if (!isLessonCompleted) {
      setViewMode('test');
    } else {
      // Move to next lesson or finish course if already completed
      if (activeLessonIdx < (course?.lessons?.length || 0) - 1) {
        setActiveLessonIdx(activeLessonIdx + 1);
      } else {
        // This is the last lesson, go to dashboard
        router.push('/student/dashboard');
      }
    }
  };

  const handlePreviousLesson = () => {
    if (activeLessonIdx > 0) {
      setActiveLessonIdx(activeLessonIdx - 1);
    }
  };

  if (loading) {
    return (
      <Layout userRole="student">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block">
              <svg
                className="animate-spin h-12 w-12 text-indigo-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <p className="mt-4 text-neutral-400">Loading course...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout userRole="student">
        <div className="text-center py-12">
          <p className="text-neutral-400">Course not found.</p>
          <Button
            onClick={() => router.push('/student/dashboard')}
            className="mt-4"
          >
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userRole="student">
      <Modal {...modalState} onClose={hideModal} />
      
      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-8rem)]">
        {/* Sidebar - Lesson List */}
        <Card className="w-full md:w-80 flex-shrink-0 flex flex-col h-full overflow-hidden bg-neutral-900 border-neutral-800">
          <div className="p-5 border-b border-neutral-800 bg-neutral-950/50">
            <button 
              onClick={() => router.push('/student/dashboard')} 
              className="text-sm text-neutral-400 hover:text-white mb-4 flex items-center transition-colors"
            >
              ← <span className="ml-1">Dashboard</span>
            </button>
            <h2 className="font-bold text-lg text-white line-clamp-2 mb-5 leading-tight">
              {course.title}
            </h2>
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Course Progress
              </span>
              <span className="text-xs font-bold text-indigo-400">{courseProgress}%</span>
            </div>
            <ProgressBar progress={courseProgress} />
            
            {/* Stats Mini */}
            <div className="mt-4 pt-4 border-t border-neutral-800 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Completed:</span>
                <span className="text-white font-semibold">{completedLessonIds.length}/{course.lessons?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Rewards:</span>
                <span className="text-amber-400 font-semibold">{totalEarned} PAS</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
            {course.lessons && course.lessons.length > 0 ? (
              course.lessons.map((lesson, idx) => {
                const isCompleted = completedLessonIds.includes(lesson.id);
                const isActive = activeLessonIdx === idx;
                
                return (
                  <button
                    key={lesson.id}
                    onClick={() => handleSelectLesson(idx)}
                    className={`w-full text-left p-3 rounded-lg text-sm flex items-center justify-between transition-all ${
                      isActive 
                        ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 shadow-[inset_0_0_10px_rgba(99,102,241,0.1)]' 
                        : 'text-neutral-400 border border-transparent hover:bg-neutral-800/50'
                    }`}
                  >
                    <div className="flex items-center min-w-0 pr-2">
                      <span className={`mr-3 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-neutral-600'}`}>
                        {lesson.video_url ? (
                          <PlayCircleIcon className="w-5 h-5" />
                        ) : (
                          <DocumentTextIcon className="w-5 h-5" />
                        )}
                      </span>
                      <span className={`truncate font-medium ${isActive ? 'text-indigo-100' : ''}`}>
                        {idx + 1}. {lesson.title || 'Lesson'}
                      </span>
                    </div>
                    {isCompleted && (
                      <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-neutral-500 text-sm">No lessons yet</p>
              </div>
            )}
          </div>
        </Card>

        {/* Main Content Area */}
        <Card className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-950 border-neutral-800 shadow-2xl">
          {activeLesson ? (
            viewMode === 'test' ? (
              // TEST VIEW
              <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950">
                <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
                  <button onClick={() => setViewMode('content')} className="text-sm font-medium text-neutral-400 hover:text-white mb-8 flex items-center transition-colors">
                    &larr; <span className="ml-1">Review Lesson Content</span>
                  </button>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <div>
                      <h2 className="text-3xl font-extrabold text-white">Milestone Test</h2>
                      <p className="text-neutral-400 mt-2">Based on: <span className="text-neutral-200 font-medium">{activeLesson.title}</span></p>
                    </div>
                    {activeLesson.payback_amount && activeLesson.payback_amount > 0 && (
                      <Badge variant="warning">Reward: {activeLesson.payback_amount} PAS</Badge>
                    )}
                  </div>
                  
                  <Card className="p-8 border-indigo-500/30 bg-neutral-900/80 shadow-[0_0_30px_rgba(99,102,241,0.05)]">
                    <p className="font-medium text-xl text-white mb-8 leading-relaxed">
                      {activeLesson.milestone?.question || `What is the key takeaway from "${activeLesson.title}"?`}
                    </p>
                    
                    {isLessonCompleted ? (
                      <div className="bg-green-500/10 border border-green-500/30 text-green-100 p-6 rounded-xl flex items-start">
                        <CheckCircleIcon className="w-8 h-8 mr-4 flex-shrink-0 text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                        <div>
                          <h4 className="font-bold text-xl text-green-400 mb-1">Test Passed!</h4>
                          <p className="text-green-200/80">You have successfully completed this milestone and earned your PAS tokens.</p>
                          
                          {activeLessonIdx < (course?.lessons?.length || 0) - 1 && (
                            <Button className="mt-6" onClick={() => handleSelectLesson(activeLessonIdx + 1)}>
                              Continue to Next Lesson
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Type your answer to demonstrate your understanding..."
                            className="w-full h-48 p-5 bg-neutral-950 border border-neutral-700 rounded-xl mb-8 text-lg text-white placeholder-neutral-600 resize-none shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                            disabled={isEvaluating}
                          />
                        </div>
                        
                        {/* Evaluation Result Area */}
                        {evalResult && !isLessonCompleted && (
                          <div className={`p-5 rounded-xl border flex items-start mb-8 ${
                            evalResult.pass ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                          }`}>
                            {evalResult.pass ? (
                              <CheckCircleIcon className="w-7 h-7 mr-4 text-green-400 flex-shrink-0 mt-0.5" />
                            ) : (
                              <XCircleIcon className="w-7 h-7 mr-4 text-red-400 flex-shrink-0 mt-0.5" />
                            )}
                            <div>
                              <h4 className={`font-bold text-lg mb-1 ${evalResult.pass ? 'text-green-400' : 'text-red-400'}`}>
                                {evalResult.pass ? 'Verification Successful!' : 'Needs Revision'}
                              </h4>
                              <p className={`text-base ${evalResult.pass ? 'text-green-200/80' : 'text-red-200/80'}`}>
                                {evalResult.feedback}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-neutral-800">
                          <Button 
                            onClick={handleSubmitMilestone} 
                            disabled={!answer.trim() || isEvaluating}
                            className="px-8 py-3.5 text-base font-bold shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                          >
                            {isEvaluating ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                AI is Evaluating...
                              </span>
                            ) : 'Submit for AI Grading'}
                          </Button>
                        </div>
                      </>
                    )}
                  </Card>
                </div>
              </div>
            ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
                <div className="flex items-center space-x-2 mb-6 text-indigo-400 bg-indigo-900/20 inline-flex px-3 py-1 rounded-full border border-indigo-500/20">
                  {activeLesson.video_url ? (
                    <>
                      <PlayCircleIcon className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">Video Lesson</span>
                    </>
                  ) : (
                    <>
                      <DocumentTextIcon className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">Document</span>
                    </>
                  )}
                </div>
                
                <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
                  {activeLesson.title || 'Lesson'}
                </h1>
                
                {isLessonCompleted && (
                  <div className="mb-6 bg-green-500/10 border border-green-500/30 text-green-100 p-4 rounded-xl flex items-center">
                    <CheckCircleIcon className="w-6 h-6 mr-3 flex-shrink-0 text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                    <span className="font-semibold">You have completed this lesson</span>
                  </div>
                )}
                
                {activeLesson.video_url ? (
                  <div className="mb-10 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-black ring-1 ring-white/10">
                    {isYouTubeUrl(activeLesson.video_url) ? (
                      <iframe
                        className="w-full aspect-video"
                        src={getYouTubeEmbedUrl(activeLesson.video_url)}
                        title="Video lesson"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video 
                        controls 
                        className="w-full aspect-video" 
                        src={activeLesson.video_url}
                        controlsList="nodownload"
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                  </div>
                ) : (
                  <div className="mb-10 rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/50 aspect-video flex items-center justify-center">
                    <p className="text-neutral-500">This lesson has no video</p>
                  </div>
                )}

                {activeLesson.description && (
                  <div className="prose prose-invert max-w-none text-neutral-300 whitespace-pre-wrap leading-relaxed text-lg mb-8">
                    {activeLesson.description}
                  </div>
                )}

                {activeLesson.payback_amount && activeLesson.payback_amount > 0 && !isLessonCompleted && (
                  <Card className="p-6 border-amber-500/30 bg-amber-500/5">
                    <div className="flex items-start">
                      <CoinIcon className="w-8 h-8 text-amber-400 mr-4 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-lg text-amber-400 mb-1">Reward</h4>
                        <p className="text-amber-200/80">
                          Complete this lesson to earn <strong>{activeLesson.payback_amount} PAS</strong>
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
              
              <div className="border-t border-neutral-800 p-6 flex justify-between items-center bg-neutral-900/50 backdrop-blur-sm">
                <div className="text-sm text-neutral-400">
                  {isLessonCompleted ? (
                    <span className="text-green-400 flex items-center">
                      <CheckCircleIcon className="w-4 h-4 mr-1"/> 
                      Completed
                    </span>
                  ) : (
                    <span>Click the button to complete the lesson</span>
                  )}
                </div>
                <Button 
                  onClick={handleCompleteAndNext}
                  className="px-6 py-2.5"
                >
                  {isLessonCompleted 
                    ? (activeLessonIdx < (course?.lessons?.length || 0) - 1 ? 'Next Lesson →' : 'Finish Course')
                    : 'Take Quiz to Complete'}
                </Button>
              </div>
            </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <DocumentTextIcon className="w-16 h-16 text-neutral-700 mx-auto mb-4" />
                <p className="text-neutral-400">Select a lesson to start</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
