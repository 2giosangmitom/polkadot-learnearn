import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strip HTML tags from a string, returning plain text.
 * Useful for rendering HTML descriptions in truncated card previews.
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Normalize a YouTube URL to the standard format: https://www.youtube.com/watch?v={videoId}
 * Handles both youtube.com and youtu.be formats
 */
export function normalizeYouTubeUrl(url: string): string {
  if (!url.trim()) return url;

  try {
    const parsed = new URL(url);
    let videoId: string | null = null;

    // Handle youtu.be short links
    if (parsed.hostname && parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.slice(1);
    }
    // Handle youtube.com URLs
    else if (parsed.hostname && parsed.hostname.includes("youtube.com")) {
      videoId = parsed.searchParams.get("v");
    }

    if (!videoId) {
      throw new Error("Cannot extract YouTube video ID");
    }

    return `https://www.youtube.com/watch?v=${videoId}`;
  } catch {
    // Return original URL if normalization fails
    return url;
  }
}

/**
 * Get YouTube embed URL from a regular YouTube URL
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;

    if (u.hostname.includes("youtube.com")) {
      videoId = u.searchParams.get("v");
    } else if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1);
    }

    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    // not a valid URL
  }
  return null;
}

/**
 * Extract the YouTube video ID from a URL.
 * Returns null if the URL is not a valid YouTube URL.
 */
export function getYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;

    if (u.hostname.includes("youtube.com")) {
      videoId = u.searchParams.get("v");
    } else if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1);
    }

    return videoId && videoId.length > 0 ? videoId : null;
  } catch {
    return null;
  }
}

/**
 * Validate if a URL is a valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  if (!url.trim()) return false;

  try {
    const u = new URL(url);
    const isYouTube =
      u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be");

    if (!isYouTube) return false;

    // Check if we can extract a video ID
    let videoId: string | null = null;
    if (u.hostname.includes("youtube.com")) {
      videoId = u.searchParams.get("v");
    } else if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1);
    }

    return Boolean(videoId && videoId.length > 0);
  } catch {
    return false;
  }
}
