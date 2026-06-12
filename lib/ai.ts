import { GoogleGenerativeAI } from '@google/generative-ai';
import type { RefinedContent } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_INSTRUCTION = `당신은 유튜브 영상 자막을 정제하는 전문 편집자입니다.
입력된 자막 원문을 다음 규칙에 따라 처리하세요:
- 불필요한 필러 단어(어, 음, 그니까, 아, 근데 등) 및 반복 표현 제거
- 구어체를 자연스러운 문어체로 변환 (의미 변경 금지)
- 내용을 의미 단위로 문단 구분 (각 문단 3~6문장)
- 원본 내용의 누락 없이 정제할 것`;

export async function refineTranscript(rawText: string): Promise<RefinedContent> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object' as const,
        properties: {
          summary:    { type: 'string' as const },
          keyPoints:  { type: 'array' as const, items: { type: 'string' as const } },
          tags:       { type: 'array' as const, items: { type: 'string' as const } },
        },
        required: ['summary', 'keyPoints', 'tags'],
      },
    },
  });

  const truncated = rawText.slice(0, 15000);

  const prompt = `다음 유튜브 자막을 분석해서 아래 3가지를 추출하세요.

- summary: 이 영상이 전달하는 핵심 내용을 2~3문장으로 요약
- keyPoints: 놓치면 안 될 핵심 포인트 5~7개. 각 항목은 "• 주제: 내용" 형식으로 한 줄씩
- tags: 주요 키워드 5개 (단어만)

자막 원문:
${truncated}`;

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(result.response.text());

  return {
    summary:    String(parsed.summary ?? ''),
    keyPoints:  Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(String) : [],
    tags:       Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
  };
}
