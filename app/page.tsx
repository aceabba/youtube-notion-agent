'use client';

import { useRef, useState } from 'react';
import type { AnalysisResult } from '@/types';

type AppState = 'idle' | 'loading' | 'done' | 'error';

const STEPS = [
  { label: '자막 수집', description: '영상 자막을 가져오는 중...' },
  { label: 'AI 정제', description: 'AI로 내용을 분석하는 중...' },
  { label: 'Notion 저장', description: 'Notion에 저장하는 중...' },
];

function YoutubeIcon() {
  return (
    <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.5 6.2c-.3-1-1.1-1.8-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5c-1 .3-1.8 1.1-2.1 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8c.3 1 1.1 1.8 2.1 2.1C4.5 20.4 12 20.4 12 20.4s7.5 0 9.4-.5c1-.3 1.8-1.1 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z" />
    </svg>
  );
}

function isValidYoutubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') return parsed.pathname.length > 1;
    if (['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(parsed.hostname)) {
      return (
        parsed.searchParams.has('v') ||
        parsed.pathname.startsWith('/embed/') ||
        parsed.pathname.startsWith('/shorts/')
      );
    }
    return false;
  } catch {
    return false;
  }
}

// ── Idle / Error view ────────────────────────────────────────────────────────

function InputView({
  onAnalyze,
  errorMsg,
}: {
  onAnalyze: (url: string) => void;
  errorMsg: string;
}) {
  const [url, setUrl] = useState('');
  const [validity, setValidity] = useState<boolean | null>(null);

  const handleChange = (v: string) => {
    setUrl(v);
    setValidity(v.length > 0 ? isValidYoutubeUrl(v) : null);
  };

  const inputBorder =
    validity === null
      ? 'border-gray-300 focus:border-red-400 focus:ring-red-100'
      : validity
        ? 'border-green-400 focus:border-green-500 focus:ring-green-100'
        : 'border-red-400 focus:border-red-500 focus:ring-red-100';

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4 shadow-lg">
            <YoutubeIcon />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">YouTube → Notion</h1>
          <p className="text-gray-500 text-sm">
            YouTube 영상 URL을 입력하면 자막을 분석해 Notion에 저장합니다
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">YouTube URL</label>
          <div className="relative mb-4">
            <input
              type="url"
              value={url}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && validity && onAnalyze(url)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={`w-full px-4 py-3 pr-10 rounded-xl border text-sm outline-none transition-all focus:ring-2 ${inputBorder}`}
            />
            {validity !== null && (
              <span
                className={`absolute right-3 top-1/2 -translate-y-1/2 font-bold ${validity ? 'text-green-500' : 'text-red-500'}`}
              >
                {validity ? '✓' : '✗'}
              </span>
            )}
          </div>
          {validity === false && (
            <p className="text-xs text-red-500 mb-3">유효한 YouTube URL을 입력해주세요.</p>
          )}

          <button
            onClick={() => validity && onAnalyze(url)}
            disabled={!validity}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm"
          >
            분석 시작
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <span className="font-semibold">오류:</span> {errorMsg}
          </div>
        )}
      </div>
    </main>
  );
}

// ── Loading view ─────────────────────────────────────────────────────────────

function LoadingView({
  currentStep,
  stepMessage,
  onCancel,
}: {
  currentStep: number;
  stepMessage: string;
  onCancel: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-8 text-center">분석 중...</h2>

          {/* Step indicators */}
          <ol className="flex items-start mb-8">
            {STEPS.map((step, idx) => {
              const num = idx + 1;
              const isDone = num < currentStep;
              const isActive = num === currentStep;
              const isLast = idx === STEPS.length - 1;
              return (
                <li key={num} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                        isDone
                          ? 'bg-green-500 text-white'
                          : isActive
                            ? 'bg-red-600 text-white ring-4 ring-red-100'
                            : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {isDone ? '✓' : num}
                    </div>
                    <span
                      className={`text-xs mt-1.5 whitespace-nowrap font-medium ${
                        isDone ? 'text-green-600' : isActive ? 'text-red-600' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${isDone ? 'bg-green-400' : 'bg-gray-200'}`}
                    />
                  )}
                </li>
              );
            })}
          </ol>

          <p className="text-center text-sm text-gray-500 mb-6 min-h-[20px]">{stepMessage}</p>

          <button
            onClick={onCancel}
            className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </main>
  );
}

// ── Done view ────────────────────────────────────────────────────────────────

function ResultView({ result, onReset }: { result: AnalysisResult; onReset: () => void }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Success banner */}
          <div className="bg-green-50 border-b border-green-100 px-6 py-3 flex items-center gap-2">
            <span className="text-green-600 font-bold">✓</span>
            <span className="text-green-700 font-medium text-sm">Notion에 저장되었습니다</span>
          </div>

          <div className="p-6">
            {/* Video info */}
            <div className="flex gap-4 mb-5">
              <img
                src={result.thumbnail}
                alt={result.title}
                className="w-32 h-20 object-cover rounded-lg flex-shrink-0 bg-gray-100"
                onError={(e) => {
                  // Fall back to hqdefault if maxresdefault is not available
                  const videoId = result.url.match(/v=([^&]+)/)?.[1];
                  if (videoId) (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                }}
              />
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900 text-sm leading-tight mb-1 line-clamp-2">
                  {result.title}
                </h2>
                <p className="text-xs text-gray-500">{result.channel}</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                요약
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
            </div>

            {/* Tags */}
            {result.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {result.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-red-50 text-red-700 text-xs rounded-full font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <a
                href={result.notionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl text-center transition-colors"
              >
                Notion에서 열기
              </a>
              <button
                onClick={onReset}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
              >
                새 영상 분석
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Root component ───────────────────────────────────────────────────────────

export default function Home() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [currentStep, setCurrentStep] = useState(1);
  const [stepMessage, setStepMessage] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const esRef = useRef<EventSource | null>(null);

  const handleAnalyze = (url: string) => {
    setAppState('loading');
    setCurrentStep(1);
    setStepMessage('자막을 수집하는 중...');

    const es = new EventSource(`/api/analyze?url=${encodeURIComponent(url)}`);
    esRef.current = es;

    es.addEventListener('step', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setCurrentStep(data.step);
      setStepMessage(data.message);
    });

    es.addEventListener('complete', (e: MessageEvent) => {
      const data: AnalysisResult = JSON.parse(e.data);
      setResult(data);
      setAppState('done');
      es.close();
    });

    es.addEventListener('error', (e: Event) => {
      const msg = (e as MessageEvent).data
        ? JSON.parse((e as MessageEvent).data).message
        : '처리 중 오류가 발생했습니다. 다시 시도해주세요.';
      setErrorMsg(msg);
      setAppState('error');
      es.close();
    });
  };

  const handleCancel = () => {
    esRef.current?.close();
    setAppState('idle');
    setErrorMsg('');
  };

  const handleReset = () => {
    setAppState('idle');
    setResult(null);
    setErrorMsg('');
    setCurrentStep(1);
  };

  if (appState === 'loading') {
    return (
      <LoadingView
        currentStep={currentStep}
        stepMessage={stepMessage}
        onCancel={handleCancel}
      />
    );
  }

  if (appState === 'done' && result) {
    return <ResultView result={result} onReset={handleReset} />;
  }

  return <InputView onAnalyze={handleAnalyze} errorMsg={errorMsg} />;
}
