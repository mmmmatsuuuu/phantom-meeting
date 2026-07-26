"use client";

import { useState, useRef, useEffect } from "react";
import type { CodeSnippet } from "@/lib/db/code-snippets";
import CodeEditor from "@/components/lesson/code-editor";

const LANGUAGE_LABELS: Record<CodeSnippet["language"], string> = {
  python: "Python",
  javascript: "JavaScript",
};

const AUTOSAVE_DELAY_MS = 1000;

type Props = {
  snippets: CodeSnippet[];
  initialCodeStates: Record<string, string>;
  onSaveToMemo: (content: Record<string, unknown>) => void;
  onClose?: () => void;
};

export default function Playground({
  snippets,
  initialCodeStates,
  onSaveToMemo,
  onClose,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(snippets[0]?.id ?? null);
  const [codeBySnippet, setCodeBySnippet] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      snippets.map((s) => [s.id, initialCodeStates[s.id] ?? s.initial_code])
    )
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const activeSnippet = snippets.find((s) => s.id === activeId) ?? null;

  const handleChange = (snippetId: string, value: string) => {
    setCodeBySnippet((prev) => ({ ...prev, [snippetId]: value }));

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch(`/api/code-snippets/${snippetId}/state`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      }).catch(() => {});
    }, AUTOSAVE_DELAY_MS);
  };

  const handleSaveToMemo = () => {
    if (!activeSnippet) return;
    const code = codeBySnippet[activeSnippet.id] ?? "";
    const doc = {
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: activeSnippet.language },
          content: code ? [{ type: "text", text: code }] : [],
        },
      ],
    };
    onSaveToMemo(doc);
  };

  return (
    <div className="sticky top-20 rounded-md border bg-card p-4 space-y-3 max-h-[calc(100vh-6rem)] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">💻 コード</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="コードを閉じる"
          >
            ✕
          </button>
        )}
      </div>

      {snippets.length === 0 || !activeSnippet ? (
        <div className="flex flex-col items-center py-10 text-center text-muted-foreground">
          <span className="text-3xl mb-2">💻</span>
          <p className="text-xs">まだコード例が登録されていません</p>
        </div>
      ) : (
        <>
          {/* スニペットタブ */}
          <div className="flex gap-1 flex-wrap">
            {snippets.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeId === s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {LANGUAGE_LABELS[activeSnippet.language]}
          </p>

          <CodeEditor
            key={activeSnippet.id}
            language={activeSnippet.language}
            initialValue={codeBySnippet[activeSnippet.id] ?? ""}
            onChange={(value) => handleChange(activeSnippet.id, value)}
          />

          <div className="flex gap-2">
            <button
              disabled
              className="flex-1 py-2 text-sm rounded-md bg-primary text-primary-foreground opacity-50 cursor-not-allowed"
              title="実行機能は準備中です"
            >
              ▶ 実行（準備中）
            </button>
            <button
              onClick={handleSaveToMemo}
              className="px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
            >
              📝 メモに保存
            </button>
          </div>

          {/* コンソール（出力は 21c/21d で実装） */}
          <div className="rounded-md border bg-muted/40 p-3 text-xs font-mono text-muted-foreground min-h-[72px] whitespace-pre-wrap">
            実行結果はここに表示されます（実行機能は準備中）
          </div>
        </>
      )}
    </div>
  );
}
