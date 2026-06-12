import { extractVideoId, fetchTranscript, fetchVideoMeta } from '@/lib/youtube';
import { refineTranscript } from '@/lib/ai';
import { saveToNotion } from '@/lib/notion';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  const encoder = new TextEncoder();

  function makeStream() {
    let controllerRef: ReadableStreamDefaultController | null = null;

    const stream = new ReadableStream({
      start(controller) {
        controllerRef = controller;
      },
    });

    const send = (event: string, data: unknown) => {
      const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      controllerRef?.enqueue(encoder.encode(chunk));
    };

    const close = () => controllerRef?.close();

    return { stream, send, close };
  }

  const { stream, send, close } = makeStream();

  // Run pipeline asynchronously so we can return the Response immediately
  (async () => {
    try {
      if (!url) {
        send('error', { message: 'URL 파라미터가 없습니다.' });
        return;
      }

      const videoId = extractVideoId(url);
      if (!videoId) {
        send('error', { message: '유효하지 않은 YouTube URL입니다.' });
        return;
      }

      // ── Step 1: Fetch transcript + metadata in parallel ──────────────────
      send('step', { step: 1, message: '영상 자막과 정보를 가져오는 중...' });
      const [transcript, meta] = await Promise.all([
        fetchTranscript(videoId),
        fetchVideoMeta(videoId),
      ]);

      // ── Step 2: AI refinement ─────────────────────────────────────────────
      send('step', { step: 2, message: 'AI로 내용을 분석하고 정제하는 중...' });
      const refined = await refineTranscript(transcript);

      // ── Step 3: Save to Notion ────────────────────────────────────────────
      send('step', { step: 3, message: 'Notion 페이지를 생성하는 중...' });
      const notionUrl = await saveToNotion({
        title: meta.title,
        channel: meta.channel,
        url: meta.url,
        summary: refined.summary,
        keyPoints: refined.keyPoints,
        tags: refined.tags,
      });

      send('complete', {
        title: meta.title,
        channel: meta.channel,
        thumbnail: meta.thumbnail,
        url: meta.url,
        summary: refined.summary,
        tags: refined.tags,
        notionUrl,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다. 다시 시도해주세요.';
      send('error', { message });
    } finally {
      close();
    }
  })();

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
