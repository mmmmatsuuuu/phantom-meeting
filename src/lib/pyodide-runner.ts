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

// 生徒のコードを実行前に変換するブートストラップ。
// input(...) の呼び出しをすべて await input(...) に自動書き換えし（ast モジュールで
// 構文木を操作）、input 自体をカスタム入力欄からの入力を待つ非同期関数に差し替える。
// メインスレッドをブロックせず、window.prompt() の代わりにコンソール内のテキスト
// ボックスで入力を受け付けられるようにするための仕組み（Worker を使わずに実現できる）。
const INPUT_BOOTSTRAP = `
import ast
import builtins

class __InputAwaiter(ast.NodeTransformer):
    def visit_Call(self, node):
        self.generic_visit(node)
        if isinstance(node.func, ast.Name) and node.func.id == "input":
            return ast.copy_location(ast.Await(value=node), node)
        return node

async def __input(prompt=""):
    return await _request_input(prompt)

builtins.input = __input

def __transform(source):
    tree = ast.parse(source)
    tree = __InputAwaiter().visit(tree)
    ast.fix_missing_locations(tree)
    return ast.unparse(tree)

__transformed_source__ = __transform(__source__)
`;

/**
 * Python コードを実行する。print() 等の出力は onOutput に逐次渡される。
 * input() の呼び出しは自動的に await input() へ変換され、onInputRequest で
 * 渡されたコールバック（テキストボックスでの入力待ち）に非同期でつながる。
 */
export async function runPythonCode(
  code: string,
  onOutput: (text: string) => void,
  onInputRequest: (prompt: string) => Promise<string>
): Promise<RunPythonResult> {
  const pyodide = await loadPyodideOnce();

  pyodide.setStdout({ batched: (msg: string) => onOutput(msg + "\n") });
  pyodide.setStderr({ batched: (msg: string) => onOutput(msg + "\n") });

  // 実行ごとに空のグローバル辞書を用意し、前回実行の変数が引き継がれないようにする
  const namespace = pyodide.runPython("{}");
  namespace.set("_request_input", (promptText: string) => {
    // プロンプト文言を改行なしでコンソールに反映し、その場に入力欄が続く見た目にする
    onOutput(promptText ?? "");
    return onInputRequest(promptText ?? "");
  });
  namespace.set("__source__", code);

  try {
    await pyodide.runPythonAsync(INPUT_BOOTSTRAP, { globals: namespace });
    const transformedSource = namespace.get("__transformed_source__") as string;
    await pyodide.runPythonAsync(transformedSource, { globals: namespace });
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  } finally {
    namespace.destroy();
  }
}
