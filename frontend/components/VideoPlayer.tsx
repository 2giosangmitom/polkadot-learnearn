'use client';

import React, { useRef, useState, useEffect } from 'react';
import { PlayCircleIcon, CheckCircleIcon } from './Icons';

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  onComplete?: () => void;
  isCompleted?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  title,
  onComplete,
  isCompleted = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasWatchedMost, setHasWatchedMost] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentProgress = (video.currentTime / video.duration) * 100;
      setProgress(currentProgress);

      // Mark as watched when 80% completed
      if (currentProgress >= 80 && !hasWatchedMost && !isCompleted) {
        setHasWatchedMost(true);
        onComplete?.();
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [hasWatchedMost, isCompleted, onComplete]);

  return (
    <div className="relative w-full bg-neutral-900 rounded-lg overflow-hidden">
      <div className="relative aspect-video">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="w-full h-full"
          controlsList="nodownload"
        >
          Your browser does not support the video tag.
        </video>

        {isCompleted && (
          <div className="absolute top-4 right-4 bg-green-500/90 text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm font-medium">
            <CheckCircleIcon className="w-4 h-4" />
            Completed
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-800">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
