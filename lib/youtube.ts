/** The 11-char id in a bare id or any common YouTube URL shape. */
const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/

const URL_PATTERNS: RegExp[] = [
  /youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/,
]

/** Extracts the video id from a pasted YouTube link, or null if it doesn't look like one. */
export function parseYoutubeId(url: string): string | null {
  const trimmed = url.trim()
  if (YOUTUBE_ID_RE.test(trimmed)) return trimmed
  for (const pattern of URL_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}`
}

export function youtubeThumbnailUrl(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`
}
