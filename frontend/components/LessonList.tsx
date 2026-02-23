'use client';

import React from 'react';
import { Lesson } from '@/types/course';
import { CheckCircleIcon, PlayCircleIcon } from './Icons';
import { Card } from './SharedUI';

interface LessonListProps {
  lessons: Lesson[];
  currentLessonId: string | null;
  completedLessonIds: string[];
  onSelectLesson: (lessonId: string) => void;
}

export const LessonList: React.FC<LessonListProps> = ({
  lessons,
  currentLessonId,
  completedLessonIds,
  onSelectLesson,
}) => {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white mb-4">Lesson List</h3>
      
      {lessons.map((lesson, index) => {
        const isCompleted = completedLessonIds.includes(lesson.id);
        const isCurrent = currentLessonId === lesson.id;
        
        return (
          <Card
            key={lesson.id}
            className={`cursor-pointer transition-all border ${
              isCurrent
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-neutral-800 hover:border-indigo-500/50'
            }`}
            onClick={() => onSelectLesson(lesson.id)}
          >
            <div className="flex items-center gap-4 p-4">
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <CheckCircleIcon className="w-8 h-8 text-green-500" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 text-sm font-medium">
                    {index + 1}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium truncate">
                  {lesson.title || `Lesson ${index + 1}`}
                </h4>
                {lesson.description && (
                  <p className="text-neutral-400 text-sm mt-1 line-clamp-2">
                    {lesson.description}
                  </p>
                )}
                {lesson.payback_amount && lesson.payback_amount > 0 && (
                  <p className="text-indigo-400 text-sm mt-1">
                    🎁 Reward: {lesson.payback_amount} PAS
                  </p>
                )}
              </div>

              {isCurrent && (
                <PlayCircleIcon className="w-6 h-6 text-indigo-500" />
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
