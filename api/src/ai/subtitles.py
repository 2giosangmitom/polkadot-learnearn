"""YouTube subtitle extraction using yt-dlp.

The heavy ``extract_info`` call is blocking, so it is offloaded to a
thread via :func:`asyncio.to_thread` to avoid blocking the event loop.
"""

import asyncio
import logging
from urllib.parse import parse_qs, urlparse

import httpx
import yt_dlp

logger = logging.getLogger(__name__)

# Reusable yt-dlp options — we only need metadata, never the video itself.
_YDL_OPTS: dict = {
    "quiet": True,
    "no_warnings": True,
    "skip_download": True,
    "writeautomaticsub": True,
    "subtitleslangs": ["en"],
}


def _normalise_youtube_url(url: str) -> str:
    """Ensure we have a canonical ``https://www.youtube.com/watch?v=…`` URL."""
    parsed = urlparse(url)
    # Handle youtu.be short links
    if parsed.hostname and "youtu.be" in parsed.hostname:
        video_id = parsed.path.lstrip("/")
    else:
        video_id = parse_qs(parsed.query).get("v", [None])[0]  # type: ignore[list-item]
    if not video_id:
        raise ValueError(f"Cannot extract YouTube video ID from: {url}")
    return f"https://www.youtube.com/watch?v={video_id}"


def _extract_subtitle_url(info: dict) -> str | None:
    """Pull the first English SRT subtitle URL from yt-dlp info dict."""
    auto_captions = info.get("automatic_captions", {})
    for cap in auto_captions.get("en", []):
        if cap.get("ext") == "srt":
            return cap["url"]
    # Fallback: manually uploaded subtitles
    subtitles = info.get("subtitles", {})
    for cap in subtitles.get("en", []):
        if cap.get("ext") == "srt":
            return cap["url"]
    return None


def _sync_get_info(url: str) -> dict:
    """Synchronous yt-dlp info extraction (runs in a thread)."""
    with yt_dlp.YoutubeDL(_YDL_OPTS) as ydl:
        return ydl.extract_info(url, download=False)  # type: ignore[return-value]


async def fetch_subtitles(video_url: str) -> str | None:
    """Fetch English subtitles for a YouTube video URL.

    Returns the SRT subtitle text, or ``None`` if no English subtitles
    are available.  Errors are logged and swallowed — the caller can
    proceed without subtitles.
    """
    try:
        canonical = _normalise_youtube_url(video_url)
        info = await asyncio.to_thread(_sync_get_info, canonical)
        subtitle_url = _extract_subtitle_url(info)
        if subtitle_url is None:
            logger.info("No English subtitles found for %s", video_url)
            return None

        async with httpx.AsyncClient() as client:
            resp = await client.get(subtitle_url, timeout=30.0)
            resp.raise_for_status()
            return resp.text
    except Exception:
        logger.exception("Failed to fetch subtitles for %s", video_url)
        return None
