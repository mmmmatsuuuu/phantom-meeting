"use client";

import { useEffect, useRef, useState } from "react";
import type { MakerRun } from "@/lib/maker-python-runner";

// 無限ループなどで大量に出力されたときに、描画が重くならないようにするための上限
const MAX_OUTPUT_CHARS = 8000;

type RunState = "idle" | "preparing" | "running";

// Pythonの例外は Traceback 付きで返るため、生徒に伝わりやすい最後の行だけを表示する
function lastLine(message: string): string {
  const lines = message.trim().split("\n").filter((line) => line.trim() !== "");
  return lines[lines.length - 1] ?? message;
}

type Props = {
  code: string;
};

/**
 * Python の実行ボタンとコンソール。自動では実行せず、押されたときだけ隔離環境で動かす。
 */
export default function MakerConsole({ code }: Props) {
  const [state, setState] = useState<RunState>("idle");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [waitingInput, setWaitingInput] = useState(false);
  const [inputDraft, setInputDraft] = useState("");
  const runRef = useRef<MakerRun | null>(null);

  useEffect(() => () => runRef.current?.stop(), []);

  const appendOutput = (text: string) => {
    setOutput((prev) => {
      const next = prev + text;
      return next.length > MAX_OUTPUT_CHARS
        ? "…（出力が多いため一部省略）\n" + next.slice(-MAX_OUTPUT_CHARS)
        : next;
    });
  };

  const handleRun = async () => {
    setOutput("");
    setError(null);
    setWaitingInput(false);
    setState("preparing");

    const { runMakerPython } = await import("@/lib/maker-python-runner");
    runRef.current = runMakerPython(code, {
      onStarted: () => setState("running"),
      onOutput: appendOutput,
      onInputRequest: (prompt) => {
        appendOutput(prompt);
        setInputDraft("");
        setWaitingInput(true);
      },
      onFinish: (runError) => {
        runRef.current = null;
        setError(runError);
        setWaitingInput(false);
        setState("idle");
      },
    });
  };

  const handleSubmitInput = () => {
    appendOutput(inputDraft + "\n");
    setWaitingInput(false);
    runRef.current?.sendInput(inputDraft);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={handleRun}
          disabled={state !== "idle"}
          className="flex-1 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state === "preparing"
            ? "準備中...（初回は少し時間がかかります）"
            : state === "running"
              ? "実行中..."
              : "▶ 実行"}
        </button>
        {state !== "idle" && (
          <button
            onClick={() => runRef.current?.stop()}
            className="px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
          >
            ■ 停止
          </button>
        )}
      </div>

      <div
        className={`rounded-md border p-3 text-xs font-mono min-h-[96px] max-h-96 overflow-y-auto whitespace-pre-wrap ${
          error
            ? "border-red-pen/50 bg-red-pen/10 text-red-pen"
            : "bg-muted/40 text-foreground"
        }`}
      >
        {output}
        {error && <p className="mt-1 font-semibold">⚠ {lastLine(error)}</p>}
        {!output && !error && !waitingInput && (
          <span className="text-muted-foreground">「実行」を押すと結果がここに表示されます</span>
        )}
        {waitingInput && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitInput();
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
    </div>
  );
}
