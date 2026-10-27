"use client";

import { useState, useRef, useEffect } from "react";
import type { CodeSnippet, StudentCodeStateEntry } from "@/lib/db/code-snippets";
import CodeEditor from "@/components/lesson/code-editor";
import SubmitButton from "@/components/shared/submit-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const LANGUAGE_LABELS: Record<CodeSnippet["language"], string> = {
  python: "Python",
  javascript: "JavaScript",
};

// 無限ループ等で大量出力された場合に文字列肥大化・描画負荷を防ぐための上限
const MAX_OUTPUT_CHARS = 8000;

// Pythonの例外はTraceback（内部の変換処理由来のフレームを含む）付きで返ってくるため、
// 生徒に伝わりやすいよう最後の行（例外の型とメッセージ）だけを抜き出す
function formatRunError(message: string): string {
  const lines = message.trim().split("\n").filter((line) => line.trim() !== "");
  return lines.length > 0 ? lines[lines.length - 1] : message;
}

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
  // DBに保存済みの内容。現在の内容と比べて未保存の変更があるかを判定する
  const [savedBySnippet, setSavedBySnippet] = useState<
    Record<string, { code: string; output: string }>
  >(() =>
    Object.fromEntries(
      snippets.map((s) => [
        s.id,
        {
          code: initialCodeStates[s.id]?.code ?? s.initial_code,
          output: initialCodeStates[s.id]?.lastOutput ?? "",
        },
      ])
    )
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // 初期コードへのリセット時にエディタを強制再マウントさせるためのバージョンカウンタ（key に含める）
  const [resetVersionBySnippet, setResetVersionBySnippet] = useState<Record<string, number>>({});
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [pendingInput, setPendingInput] = useState<{
    prompt: string;
    resolve: (value: string) => void;
  } | null>(null);
  const [inputDraft, setInputDraft] = useState("");
  // input() に答えた値をコンソールへエコーするため、実行中のonOutputを参照できるようにする
  const onOutputRef = useRef<(text: string) => void>(() => {});

  const isDirty = (snippetId: string) => {
    const saved = savedBySnippet[snippetId];
    return (
      (codeBySnippet[snippetId] ?? "") !== (saved?.code ?? "") ||
      (outputBySnippet[snippetId] ?? "") !== (saved?.output ?? "")
    );
  };
  const hasUnsavedChanges = snippets.some((s) => isDirty(s.id));

  // 未保存の変更がある状態でページを離れようとしたらブラウザの確認ダイアログを出す
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const activeSnippet = snippets.find((s) => s.id === activeId) ?? null;
  const output = activeId ? (outputBySnippet[activeId] ?? "") : "";

  const handleChange = (snippetId: string, value: string) => {
    setCodeBySnippet((prev) => ({ ...prev, [snippetId]: value }));
  };

  // DBへの書き込みは生徒が「保存」を押したときだけ行う
  // （編集のたびに保存すると授業中の同時編集で書き込みが膨大になるため）
  const handleSave = async () => {
    if (!activeSnippet) return;
    const snippetId = activeSnippet.id;
    const code = codeBySnippet[snippetId] ?? "";
    const lastOutput = outputBySnippet[snippetId] ?? "";
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/code-snippets/${snippetId}/state`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, lastOutput: lastOutput || null }),
      });
      if (!res.ok) throw new Error();
      setSavedBySnippet((prev) => ({ ...prev, [snippetId]: { code, output: lastOutput } }));
    } catch {
      setSaveError("保存に失敗しました。もう一度お試しください");
    } finally {
      setSaving(false);
    }
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
    // 生徒が入力した値自体もコンソール（＝メモに保存される内容）に残す。
    // これが無いとプロンプト文言だけが残り、後で見返した時に何を入力したか分からなくなる
    onOutputRef.current(inputDraft + "\n");
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

    let fullOutput = "";
    const onOutput = (text: string) => {
      fullOutput += text;
      // 無限ループのprint連発などで際限なく肥大化しないよう、直近分のみ保持する
      if (fullOutput.length > MAX_OUTPUT_CHARS) {
        fullOutput = "…（出力が多いため一部省略）\n" + fullOutput.slice(-MAX_OUTPUT_CHARS);
      }
      setOutputBySnippet((prev) => ({ ...prev, [snippetId]: fullOutput }));
    };
    onOutputRef.current = onOutput;

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
    }
  };

  const confirmReset = () => {
    if (!activeSnippet) return;

    const snippetId = activeSnippet.id;
    const initialCode = activeSnippet.initial_code;

    setCodeBySnippet((prev) => ({ ...prev, [snippetId]: initialCode }));
    setOutputBySnippet((prev) => ({ ...prev, [snippetId]: "" }));
    setRunError(null);
    setResetVersionBySnippet((prev) => ({ ...prev, [snippetId]: (prev[snippetId] ?? 0) + 1 }));
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
                  setSaveError(null);
                }}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeId === s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.title}
                {isDirty(s.id) && <span aria-label="未保存の変更あり"> ●</span>}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {LANGUAGE_LABELS[activeSnippet.language]}
          </p>

          <CodeEditor
            key={`${activeSnippet.id}-${resetVersionBySnippet[activeSnippet.id] ?? 0}`}
            language={activeSnippet.language}
            initialValue={codeBySnippet[activeSnippet.id] ?? ""}
            onChange={(value) => handleChange(activeSnippet.id, value)}
            onRun={handleRun}
          />
          <p className="text-[11px] text-muted-foreground -mt-2">
            💡 エディタ内で Cmd/Ctrl + Enter でも実行できます
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRun}
              disabled={running}
              className="flex-1 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? "実行中..." : "▶ 実行"}
            </button>
            <SubmitButton
              loading={saving}
              loadingLabel="保存中..."
              disabled={!isDirty(activeSnippet.id)}
              onClick={handleSave}
              className="px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              💾 保存
            </SubmitButton>
            <button
              onClick={handleSaveToMemo}
              className="px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
            >
              📝 メモに保存
            </button>
            <button
              onClick={() => setResetConfirmOpen(true)}
              className="px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
              title="教師が配信した初期コードに戻す"
            >
              🔄 初期コードにリセット
            </button>
          </div>
          <p
            className={`text-[11px] -mt-1 ${saveError ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}
          >
            {saveError ??
              (isDirty(activeSnippet.id)
                ? "未保存の変更があります。「保存」を押すと、コードと実行結果が保存されます"
                : "保存済み")}
          </p>

          {/* コンソール */}
          <div
            className={`rounded-md border p-3 text-xs font-mono min-h-[72px] whitespace-pre-wrap ${
              runError
                ? "border-red-300 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400"
                : "bg-muted/40 text-foreground"
            }`}
          >
            {output}
            {runError && (
              <p className="mt-1 font-semibold">⚠ {formatRunError(runError)}</p>
            )}
            {!output && !runError && !pendingInput && (
              <span className="text-muted-foreground">
                「実行」を押すと結果がここに表示されます
              </span>
            )}
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

      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>初期コードにリセットしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              このスニペットのコードを、教師が配信した初期コードに戻します。現在の編集内容と実行結果は失われます。リセット後に「保存」を押すと、保存済みの内容も初期コードで上書きされます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset}>リセットする</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
