"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { CodeSnippet, StudentCodeStateEntry } from "@/lib/db/code-snippets";
import MemoSection from "@/components/lesson/memo-section";

// CodeMirror・Pyodide連携を含むため、プレイグラウンドが無効なレッスンの
// バンドルには含めない（プレイグラウンド有効レッスンでタブを開いたときのみ読み込む）
const Playground = dynamic(() => import("@/components/lesson/playground"), {
  ssr: false,
  loading: () => (
    <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
      読み込み中...
    </div>
  ),
});

type Tab = "memo" | "code";

type Props = {
  lessonId: string;
  enablePlayground: boolean;
  snippets: CodeSnippet[];
  initialCodeStates: Record<string, StudentCodeStateEntry>;
  getCurrentTime: () => number | null;
  seekTo: (seconds: number) => void;
  onClose?: () => void;
};

export default function LessonSidePanel({
  lessonId,
  enablePlayground,
  snippets,
  initialCodeStates,
  getCurrentTime,
  seekTo,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("memo");
  // コードは「保存」を押すまでDBに書き込まないため、タブ切り替えで未保存の編集が消えないよう
  // 一度開いたプレイグラウンドはアンマウントせず非表示で保持する
  const [codeOpened, setCodeOpened] = useState(false);
  const [prefillContent, setPrefillContent] = useState<{
    content: Record<string, unknown>;
    key: number;
  } | null>(null);

  const handleSaveToMemo = (content: Record<string, unknown>) => {
    setPrefillContent({ content, key: Date.now() });
    setActiveTab("memo");
  };

  if (!enablePlayground) {
    return (
      <MemoSection
        lessonId={lessonId}
        getCurrentTime={getCurrentTime}
        seekTo={seekTo}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1 p-1 bg-muted rounded-md w-fit">
        <button
          onClick={() => setActiveTab("memo")}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "memo"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          📝 メモ
        </button>
        <button
          onClick={() => {
            setActiveTab("code");
            setCodeOpened(true);
          }}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "code"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          💻 コード
        </button>
      </div>

      <div className={activeTab === "memo" ? "" : "hidden"}>
        <MemoSection
          lessonId={lessonId}
          getCurrentTime={getCurrentTime}
          seekTo={seekTo}
          onClose={onClose}
          prefillContent={prefillContent}
        />
      </div>
      {codeOpened && (
        <div className={activeTab === "code" ? "" : "hidden"}>
          <Playground
            snippets={snippets}
            initialCodeStates={initialCodeStates}
            onSaveToMemo={handleSaveToMemo}
            onClose={onClose}
          />
        </div>
      )}
    </div>
  );
}
