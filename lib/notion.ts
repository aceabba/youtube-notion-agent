import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

function rich(text: string) {
  return [{ type: 'text' as const, text: { content: text } }];
}

function divider() {
  return { type: 'divider' as const, divider: {} };
}

function h3(text: string) {
  return {
    type: 'heading_3' as const,
    heading_3: { rich_text: rich(text) },
  };
}

function callout(text: string, emoji: string) {
  return {
    type: 'callout' as const,
    callout: {
      rich_text: rich(text),
      icon: { type: 'emoji' as const, emoji },
      color: 'gray_background' as const,
    },
  };
}

function bullet(text: string) {
  return {
    type: 'bulleted_list_item' as const,
    bulleted_list_item: { rich_text: rich(text) },
  };
}

function para(text: string) {
  return {
    type: 'paragraph' as const,
    paragraph: { rich_text: rich(text) },
  };
}

export async function saveToNotion({
  title,
  channel,
  url,
  summary,
  keyPoints,
  tags,
}: {
  title: string;
  channel: string;
  url: string;
  summary: string;
  keyPoints: string[];
  tags: string[];
}): Promise<string> {
  const databaseId = process.env.NOTION_DATABASE_ID;
  const pageId     = process.env.NOTION_PAGE_ID;

  if (!databaseId && !pageId) {
    throw new Error('NOTION_DATABASE_ID 또는 NOTION_PAGE_ID 환경변수를 설정해주세요.');
  }

  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  /*
   * Notion 페이지 구조
   * ─────────────────────────────────────
   * 📌 핵심 요약  (callout)
   * ───
   * 🔑 핵심 포인트  (h3)
   *   • ...
   *   • ...
   * ───
   * 🏷️ 태그: xxx  채널: xxx  |  🔗 원본 링크  |  📅 저장 일시
   * ─────────────────────────────────────
   */
  const blocks = [
    callout(summary, '📌'),
    divider(),
    h3('🔑 핵심 포인트'),
    ...keyPoints.map((p) => bullet(p)),
    divider(),
    para(`🏷️  ${tags.map((t) => `#${t}`).join('  ')}   ·   📺 ${channel}   ·   📅 ${now}`),
    para(`🔗 ${url}`),
  ];

  // Resolve parent & title property name
  let parent: { database_id: string } | { page_id: string };
  let titlePropName = 'title';

  if (databaseId) {
    parent = { database_id: databaseId };
    const db = await notion.databases.retrieve({ database_id: databaseId });
    const titleEntry = Object.entries(db.properties).find(([, v]) => v.type === 'title');
    if (titleEntry) titlePropName = titleEntry[0];
  } else {
    parent = { page_id: pageId! };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = await notion.pages.create({
    parent,
    properties: {
      [titlePropName]: { title: [{ type: 'text', text: { content: title } }] },
    },
    children: blocks as any,
  });

  return `https://notion.so/${page.id.replace(/-/g, '')}`;
}
