import { version as pyodideVersion } from "pyodide/package.json";

const CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`;
const ASSET_FILES = ["pyodide.js", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"];
const RUN_TIMEOUT_MS = 10_000;

// 他の生徒が書いたコードを実行するため、Cookie・DOM・通信に届かない環境で動かす。
// - iframe の sandbox に allow-same-origin を付けず、サイトと別オリジンとして扱う
// - CSP で外部への通信を遮断する（pyodide.asm.mjs の読み込みのみ CDN を許可）
// - Worker で実行し、無限ループでも画面を固めず terminate で止められるようにする
const SANDBOX_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net",
  "worker-src blob:",
  "connect-src blob:",
].join("; ");

// input() は def の中からも呼べるよう run_sync で同期的に待つ。
// 対応していないブラウザ（JSPI 非対応）では、トップレベルの input() を await に変換する
const PYTHON_BOOTSTRAP = `
import ast
import builtins
from pyodide.ffi import can_run_sync, run_sync

class __AwaitInput(ast.NodeTransformer):
    def visit_Call(self, node):
        self.generic_visit(node)
        if isinstance(node.func, ast.Name) and node.func.id == "input":
            return ast.copy_location(ast.Await(value=node), node)
        return node

if can_run_sync():
    builtins.input = lambda prompt="": run_sync(__request_input(str(prompt)))
    __source_to_run__ = __source__
else:
    async def __async_input(prompt=""):
        return await __request_input(str(prompt))
    builtins.input = __async_input
    __tree = __AwaitInput().visit(ast.parse(__source__))
    ast.fix_missing_locations(__tree)
    __source_to_run__ = ast.unparse(__tree)
`;

const WORKER_SOURCE = `
let resolveInput = null;
onmessage = async (event) => {
  const message = event.data;
  if (message.type === "input") {
    resolveInput?.(message.value);
    resolveInput = null;
    return;
  }
  if (message.type !== "run") return;
  try {
    const urls = {};
    for (const [name, buffer] of Object.entries(message.assets)) {
      const type = name.endsWith(".wasm")
        ? "application/wasm"
        : name.endsWith(".js")
          ? "text/javascript"
          : "application/octet-stream";
      urls[name] = URL.createObjectURL(new Blob([buffer], { type }));
    }
    const originalFetch = self.fetch;
    self.fetch = (url, options) => {
      const name = String(url).split("/").pop();
      return urls[name]
        ? originalFetch(urls[name], options)
        : Promise.reject(new Error("このプログラムからは通信できません"));
    };
    importScripts(urls["pyodide.js"]);
    const pyodide = await loadPyodide({ indexURL: message.indexURL });
    pyodide.setStdout({ batched: (text) => postMessage({ type: "output", text: text + "\\n" }) });
    pyodide.setStderr({ batched: (text) => postMessage({ type: "output", text: text + "\\n" }) });
    const namespace = pyodide.runPython("{}");
    namespace.set("__source__", message.code);
    namespace.set("__request_input", (prompt) => new Promise((resolve) => {
      resolveInput = resolve;
      postMessage({ type: "input-request", prompt });
    }));
    await pyodide.runPythonAsync(message.bootstrap, { globals: namespace });
    const source = namespace.get("__source_to_run__");
    postMessage({ type: "started" });
    await pyodide.runPythonAsync(source, { globals: namespace });
    postMessage({ type: "done", error: null });
  } catch (error) {
    postMessage({ type: "done", error: error instanceof Error ? error.message : String(error) });
  }
};
`;

/** sandbox 付き iframe の srcdoc を組み立てる。生徒のコードは埋め込まず postMessage で渡す */
export function buildSandboxHtml(): string {
  const workerSource = JSON.stringify(WORKER_SOURCE).replace(/</g, "\\u003c");
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${SANDBOX_CSP}"><script>
const worker = new Worker(URL.createObjectURL(new Blob([${workerSource}], { type: "text/javascript" })));
worker.onmessage = (event) => parent.postMessage(event.data, "*");
worker.onerror = (event) => parent.postMessage({ type: "done", error: event.message }, "*");
onmessage = (event) => worker.postMessage(event.data);
parent.postMessage({ type: "ready" }, "*");
<\/script>`;
}

let assetsPromise: Promise<Record<string, ArrayBuffer>> | null = null;

// sandbox 内はオリジンが毎回変わりブラウザのキャッシュが効かないため、
// 通常のオリジンで取得（＝キャッシュ）した資材を iframe へ渡す
function loadAssets(): Promise<Record<string, ArrayBuffer>> {
  if (!assetsPromise) {
    assetsPromise = Promise.all(
      ASSET_FILES.map(async (name) => {
        const res = await fetch(CDN_BASE + name);
        if (!res.ok) throw new Error("Pythonの実行環境を読み込めませんでした");
        return [name, await res.arrayBuffer()] as const;
      })
    )
      .then((entries) => Object.fromEntries(entries))
      .catch((error) => {
        assetsPromise = null;
        throw error;
      });
  }
  return assetsPromise;
}

export type MakerRunHandlers = {
  onStarted: () => void;
  onOutput: (text: string) => void;
  onInputRequest: (prompt: string) => void;
  onFinish: (error: string | null) => void;
};

export type MakerRun = {
  sendInput: (value: string) => void;
  stop: () => void;
};

/**
 * Python コードを隔離環境で実行する。stop() または時間切れで実行環境ごと破棄する。
 * input() の入力待ちの間は時間切れの計測を止める。
 */
export function runMakerPython(code: string, handlers: MakerRunHandlers): MakerRun {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.style.display = "none";

  let finished = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const clearRunTimeout = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
  };

  const finish = (error: string | null) => {
    if (finished) return;
    finished = true;
    clearRunTimeout();
    window.removeEventListener("message", handleMessage);
    iframe.remove();
    handlers.onFinish(error);
  };

  const startRunTimeout = () => {
    clearRunTimeout();
    timeoutId = setTimeout(() => {
      finish("10秒以上動き続けたため止めました（無限ループの可能性があります）");
    }, RUN_TIMEOUT_MS);
  };

  const handleMessage = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow) return;
    const message = event.data as {
      type: string;
      text?: string;
      prompt?: string;
      error?: string | null;
    };

    if (message.type === "ready") {
      loadAssets()
        .then((assets) => {
          iframe.contentWindow?.postMessage(
            { type: "run", code, assets, indexURL: CDN_BASE, bootstrap: PYTHON_BOOTSTRAP },
            "*"
          );
        })
        .catch((error: unknown) => {
          finish(error instanceof Error ? error.message : String(error));
        });
    } else if (message.type === "started") {
      handlers.onStarted();
      startRunTimeout();
    } else if (message.type === "output") {
      handlers.onOutput(message.text ?? "");
    } else if (message.type === "input-request") {
      clearRunTimeout();
      handlers.onInputRequest(message.prompt ?? "");
    } else if (message.type === "done") {
      finish(message.error ?? null);
    }
  };

  window.addEventListener("message", handleMessage);
  iframe.srcdoc = buildSandboxHtml();
  document.body.appendChild(iframe);

  return {
    sendInput: (value) => {
      startRunTimeout();
      iframe.contentWindow?.postMessage({ type: "input", value }, "*");
    },
    stop: () => finish(null),
  };
}
