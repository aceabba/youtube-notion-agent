import { YoutubeTranscript } from 'youtube-transcript';
import type { VideoMeta } from '@/types';

export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1).split('?')[0] || null;
    }
    if (['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(parsed.hostname)) {
      if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
      if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.slice(7) || null;
      if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.slice(8) || null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchVideoMeta(videoId: string): Promise<VideoMeta> {
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const res = await fetch(oembedUrl);
  if (!res.ok) throw new Error('영상 정보를 가져올 수 없습니다. 비공개 영상이거나 삭제된 영상일 수 있습니다.');
  const data = await res.json();

  // Try high-res thumbnail, fall back to hqdefault
  const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  return {
    title: data.title,
    channel: data.author_name,
    thumbnail,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

export async function fetchTranscript(videoId: string): Promise<string> {
  const langPriority = ['ko', 'en'];

  for (const lang of langPriority) {
    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId, { lang });
      if (items.length > 0) {
        return items.map((t) => t.text).join(' ');
      }
    } catch {
      // try next language
    }
  }

  // Last attempt: no language preference (auto-generated)
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    if (items.length === 0) throw new Error('empty');
    return items.map((t) => t.text).join(' ');
  } catch {
    throw new Error(
      '자막을 가져올 수 없습니다. 자막이 비활성화된 영상이거나 비공개 영상일 수 있습니다.'
    );
  }
}
