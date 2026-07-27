"use client";

import { useState, useRef, useEffect } from "react";
import type { CodeSnippet, StudentCodeStateEntry } from "@/lib/db/code-snippets";
import CodeEditor from "@/components/lesson/code-editor";

const LANGUAGE_LABELS: Record<CodeSnippet["language"], string> = {
  python: "Python",
  javascript: "JavaScript",
};

const AUTOSAVE_DELAY_MS = 1000;

type Props = {
  snippets: CodeSnippet[];
  initialCodeStates: Record<string, StudentCodeStateEntry>;
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
      snippets.map((s) => [s.id, initialCodeStates[s.id]?.code ?? s.initial_code])
    )
  );
  const [outputBySnippet, setOutputBySnippet] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      snippets.map((s) => [s.id, initialCodeStates[s.id]?.lastOutput ?? ""])
    )
  );
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [pendingInput, setPendingInput] = useState<{
    prompt: string;
    resolve: (value: string) => void;
  } | null>(null);
  const [inputDraft, setInputDraft] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const activeSnippet = snippets.find((s) => s.id === activeId) ?? null;
  const output = activeId ? (outputBySnippet[activeId] ?? "") : "";

  const persistState = (snippetId: string, code: string, lastOutput: string) => {
    fetch(`/api/code-snippets/${snippetId}/state`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, lastOutput: lastOutput || null }),
    }).catch(() => {});
  };

  const handleChange = (snippetId: string, value: string) => {
    setCodeBySnippet((prev) => ({ ...prev, [snippetId]: value }));

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistState(snippetId, value, outputBySnippet[snippetId] ?? "");
    }, AUTOSAVE_DELAY_MS);
  };

  // Python の input() 呼び出しに応答する。コンソール内のテキストボックスに
  // 入力・送信されるまで解決しない Promise を返す（メインスレッドはブロックしない）
  const requestInput = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      setInputDraft("");
      setPendingInput({ prompt, resolve });
    });
  };

  const submitPendingInput = () => {
    if (!pendingInput) return;
    pendingInput.resolve(inputDraft);
    setPendingInput(null);
  };

  const handleRun = async () => {
    if (!activeSnippet || running) return;
    const snippetId = activeSnippet.id;
    const code = codeBySnippet[snippetId] ?? "";
    setRunning(true);
    setOutputBySnippet((prev) => ({ ...prev, [snippetId]: "" }));
    setRunError(null);
    setPendingInput(null);

    // React state の更新は非同期のため、実行終了後にDBへ保存する値は
    // ローカル変数に直接蓄積して確定させる
    let fullOutput = "";
    const onOutput = (text: string) => {
      fullOutput += text;
      setOutputBySnippet((prev) => ({ ...prev, [snippetId]: fullOutput }));
    };

    try {
      if (activeSnippet.language === "python") {
        const { runPythonCode } = await import("@/lib/pyodide-runner");
        const result = await runPythonCode(code, onOutput, requestInput);
        setRunError(result.error);
      } else {
        const { runJavaScriptCode } = await import("@/lib/js-runner");
        const result = await runJavaScriptCode(code, onOutput);
        setRunError(result.error);
      }
    } finally {
      setRunning(false);
      setPendingInput(null);
      // コード自体は自動保存済みの可能性が高いが、実行結果と一致させるため
      // 直近のコードと合わせて確定保存する（デバウンス待ちをキャンセル）
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      persistState(snippetId, code, fullOutput);
    }
  };

  const handleSaveToMemo = () => {
    if (!activeSnippet) return;
    const code = codeBySnippet[activeSnippet.id] ?? "";
    const result = outputBySnippet[activeSnippet.id] ?? "";

    const content: Record<string, unknown>[] = [
      {
        type: "codeBlock",
        attrs: { language: activeSnippet.language },
        content: code ? [{ type: "text", text: code }] : [],
      },
    ];

    if (result.trim()) {
      content.push({
        type: "paragraph",
        content: [{ type: "text", text: "実行結果:" }],
      });
      content.push({
        type: "codeBlock",
        attrs: { language: null },
        content: [{ type: "text", text: result.trim() }],
      });
    }

    onSaveToMemo({ type: "doc", content });
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
                onClick={() => {
                  setActiveId(s.id);
                  setRunError(null);
                }}
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
              onClick={handleRun}
              disabled={running}
              className="flex-1 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? "実行中..." : "▶ 実行"}
            </button>
            <button
              onClick={handleSaveToMemo}
              className="px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
            >
              📝 メモに保存
            </button>
          </div>

          {/* コンソール */}
          <div
            className={`rounded-md border p-3 text-xs font-mono min-h-[72px] whitespace-pre-wrap ${
              runError
                ? "border-red-300 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400"
                : "bg-muted/40 text-foreground"
            }`}
          >
            {output || (!pendingInput && (
              <span className="text-muted-foreground">
                「実行」を押すと結果がここに表示されます
              </span>
            ))}
            {pendingInput && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitPendingInput();
                }}
                className="flex items-center gap-2 mt-1"
              >
                <input
                  autoFocus
                  value={inputDraft}
                  onChange={(e) => setInputDraft(e.target.value)}
                  className="flex-1 min-w-0 px-2 py-1 text-xs font-mono rounded border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="入力してEnter"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity shrink-0"
                >
                  送信
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
