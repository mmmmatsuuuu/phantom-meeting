"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { CodeSnippet, StudentCodeStateEntry } from "@/lib/db/code-snippets";
import type { TiptapDoc } from "@/lib/tiptap-utils";
import NoteSection, { type NoteSectionHandle } from "@/components/lesson/note-section";

// CodeMirror・Pyodide連携を含むため、プレイグラウンドが無効なレッスンの
// バンドルには含めない（プレイグラウンド有効レッスンでタブを開いたときのみ読み込む）
const Playground = dynamic(() => import("@/components/lesson/playground"), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-muted-foreground">読み込み中...</p>,
});

type Tab = "note" | "code";

type Props = {
  lessonId: string;
  template: TiptapDoc | null;
  enablePlayground: boolean;
  snippets: CodeSnippet[];
  initialCodeStates: Record<string, StudentCodeStateEntry>;
};

/** 紙の端から出たインデックス。ノートとコードを切り替える */
function IndexTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative top-px px-[18px] pt-1 pb-[3px] border border-b-0 border-rule-strong rounded-t text-[13px] transition-colors ${
        active ? "z-[1] bg-sheet text-ink font-semibold" : "bg-surface text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function LessonSidePanel({
  lessonId,
  template,
  enablePlayground,
  snippets,
  initialCodeStates,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("note");
  // コードは「保存」を押すまでDBに書き込まないため、タブ切り替えで未保存の編集が消えないよう
  // 一度開いたプレイグラウンドはアンマウントせず非表示で保持する
  const [codeOpened, setCodeOpened] = useState(false);
  const noteRef = useRef<NoteSectionHandle>(null);

  const handleSaveToMemo = (content: Record<string, unknown>) => {
    noteRef.current?.append(content);
    setActiveTab("note");
  };

  return (
    <div>
      <div className="flex gap-1 pl-3">
        <IndexTab active={activeTab === "note"} onClick={() => setActiveTab("note")}>
          ノート
        </IndexTab>
        {enablePlayground && (
          <IndexTab
            active={activeTab === "code"}
            onClick={() => {
              setActiveTab("code");
              setCodeOpened(true);
            }}
          >
            コード
          </IndexTab>
        )}
      </div>
      <div className="bg-sheet border border-rule-strong p-4">
        <div className={activeTab === "note" ? "" : "hidden"}>
          <NoteSection ref={noteRef} lessonId={lessonId} template={template} />
        </div>
        {codeOpened && (
          <div className={activeTab === "code" ? "" : "hidden"}>
            <Playground
              snippets={snippets}
              initialCodeStates={initialCodeStates}
              onSaveToMemo={handleSaveToMemo}
            />
          </div>
        )}
      </div>
    </div>
  );
}
