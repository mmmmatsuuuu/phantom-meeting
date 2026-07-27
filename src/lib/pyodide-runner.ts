import type { PyodideInterface } from "pyodide";
import { version as pyodideVersion } from "pyodide/package.json";

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideInterface>;
  }
}

let pyodidePromise: Promise<PyodideInterface> | null = null;
let scriptPromise: Promise<void> | null = null;

// pyodide npm パッケージ本体（pyodide.js/.mjs）は Node.js 検出用の動的 require を
// 内部に含んでおり、Next.js のバンドラーで `import("pyodide")` すると
// "Cannot find module as expression is too dynamic" で失敗する。
// そのためバンドルせず、CDN上のスクリプトを <script> タグで読み込み、
// window.loadPyodide をブラウザから直接呼び出す方式にする。
// バージョン文字列だけは package.json（純粋なJSONで動的requireを含まない）
// から静的に取得し、CDN URLとのバージョン不一致を防ぐ。
function loadScriptOnce(): Promise<void> {
  if (typeof window !== "undefined" && window.loadPyodide) {
    return Promise.resolve();
  }
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/pyodide.js`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Pyodideスクリプトの読み込みに失敗しました"));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/**
 * Pyodide をブラウザにロードする（初回のみ、以降はキャッシュを再利用）。
 * WASM 本体・標準ライブラリは jsDelivr の公式CDNから取得する（無料枠方針・自前ホスティング不要のため）。
 */
function loadPyodideOnce(): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      await loadScriptOnce();
      if (!window.loadPyodide) {
        throw new Error("Pyodideの読み込みに失敗しました");
      }
      return window.loadPyodide({
        indexURL: `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`,
      });
    })();
  }
  return pyodidePromise;
}

export type RunPythonResult = {
  error: string | null;
};

/**
 * Python コードを実行する。print() 等の出力は onOutput に逐次渡される。
 * input() はブラウザ標準の window.prompt() にフックする（同期的に値が返るまで待機する）。
 */
export async function runPythonCode(
  code: string,
  onOutput: (text: string) => void
): Promise<RunPythonResult> {
  const pyodide = await loadPyodideOnce();

  pyodide.setStdout({ batched: (msg: string) => onOutput(msg + "\n") });
  pyodide.setStderr({ batched: (msg: string) => onOutput(msg + "\n") });

  // 実行ごとに空のグローバル辞書を用意し、前回実行の変数が引き継がれないようにする
  const namespace = pyodide.runPython("{}");
  namespace.set("_browser_input", (promptText: string) => {
    const value = window.prompt(promptText ?? "");
    return value === null ? "" : value;
  });

  const bootstrap =
    "import builtins\nbuiltins.input = lambda prompt='': _browser_input(prompt)\n";

  try {
    await pyodide.runPythonAsync(bootstrap + code, { globals: namespace });
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  } finally {
    namespace.destroy();
  }
}
