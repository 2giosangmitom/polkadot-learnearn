"use client";

import { useEffect, useRef } from "react";
import "plyr/dist/plyr.css";
import { getYouTubeVideoId } from "@/lib/utils";

interface VideoPlayerProps {
  /** YouTube video URL (youtube.com or youtu.be format) */
  videoUrl: string;
  /** Accessible title for the player */
  title?: string;
}

export function VideoPlayer({ videoUrl, title }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<InstanceType<typeof import("plyr").default> | null>(
    null,
  );

  const videoId = getYouTubeVideoId(videoUrl);

  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    // Find the target div inside the container
    const target = containerRef.current.querySelector<HTMLDivElement>(
      "[data-plyr-provider]",
    );
    if (!target) return;

    let destroyed = false;

    // Dynamically import Plyr so its module code (which accesses `document`)
    // never runs during SSR.
    import("plyr").then(({ default: Plyr }) => {
      if (destroyed || !containerRef.current) return;

      const player = new Plyr(target, {
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "mute",
          "volume",
          "captions",
          "settings",
          "pip",
          "airplay",
          "fullscreen",
        ],
        settings: ["captions", "quality", "speed"],
        youtube: {
          noCookie: true,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          controls: 0,
          fs: 0,
          disablekb: 1,
        },
        tooltips: { controls: true, seek: true },
        keyboard: { focused: true, global: false },
      });

      playerRef.current = player;
    });

    return () => {
      destroyed = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  // Non-YouTube URL fallback
  if (!videoId) {
    return (
      <div className="bg-black">
        <div className="flex aspect-video items-center justify-center">
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Watch video externally
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-black"
      style={
        {
          "--plyr-color-main": "#E6007A",
        } as React.CSSProperties
      }
    >
      <div
        data-plyr-provider="youtube"
        data-plyr-embed-id={videoId}
        {...(title ? { "aria-label": title } : {})}
      />
    </div>
  );
}
