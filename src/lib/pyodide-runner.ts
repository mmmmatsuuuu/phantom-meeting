import type { PyodideInterface } from "pyodide";

let pyodidePromise: Promise<PyodideInterface> | null = null;

/**
 * Pyodide をブラウザにロードする（初回のみ、以降はキャッシュを再利用）。
 * WASM 本体・標準ライブラリは jsDelivr の公式CDNから取得する（無料枠方針・自前ホスティング不要のため）。
 * バージョンは pyodide npm パッケージの export から取得し、CDN側との不一致を防ぐ。
 */
function loadPyodideOnce(): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const { loadPyodide, version } = await import("pyodide");
      return loadPyodide({
        indexURL: `https://cdn.jsdelivr.net/pyodide/v${version}/full/`,
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
