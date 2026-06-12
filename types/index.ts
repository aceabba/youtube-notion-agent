export interface VideoMeta {
  title: string;
  channel: string;
  thumbnail: string;
  url: string;
}

export interface RefinedContent {
  summary: string;
  keyPoints: string[];
  tags: string[];
}

export interface AnalysisResult extends VideoMeta {
  summary: string;
  tags: string[];
  notionUrl: string;
}
