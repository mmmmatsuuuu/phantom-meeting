const RUN_TIMEOUT_MS = 10_000;

type OutgoingMessage =
  | { type: "log"; text: string }
  | { type: "error"; text: string }
  | { type: "done" };

let counter = 0;

/**
 * サンドボックス化した iframe 内で任意の JavaScript を実行する。
 * console.log の出力・エラーは postMessage で親（このモジュール）に転送される。
 * input 用の window.prompt() は iframe の sandbox 属性に allow-modals を付与して許可する
 * （allow-same-origin は付与しないため、親ページの Cookie・DOM には到達できない）。
 */
export async function runJavaScriptCode(
  code: string,
  onOutput: (text: string) => void
): Promise<{ error: string | null }> {
  const id = `code-playground-run-${++counter}`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts allow-modals");
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  return new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(timeoutId);
      iframe.remove();
    };

    const finish = (error: string | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ error });
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      const data = event.data as { id: string } & OutgoingMessage;
      if (!data || data.id !== id) return;

      if (data.type === "log") {
        onOutput(data.text + "\n");
      } else if (data.type === "error") {
        onOutput(data.text + "\n");
        finish(data.text);
      } else if (data.type === "done") {
        finish(null);
      }
    };
    window.addEventListener("message", handleMessage);

    const timeoutId = setTimeout(() => {
      onOutput("実行がタイムアウトしました（無限ループの可能性があります）\n");
      finish("timeout");
    }, RUN_TIMEOUT_MS);

    const escapedCode = JSON.stringify(code);
    const html = `<!doctype html><html><body><script>
      const id = ${JSON.stringify(id)};
      const send = (msg) => parent.postMessage(Object.assign({ id }, msg), "*");
      const format = (v) => (typeof v === "string" ? v : JSON.stringify(v));
      console.log = (...args) => send({ type: "log", text: args.map(format).join(" ") });
      console.error = (...args) => send({ type: "log", text: args.map(format).join(" ") });
      window.onerror = (message) => { send({ type: "error", text: String(message) }); return true; };
      try {
        (0, eval)(${escapedCode});
        send({ type: "done" });
      } catch (e) {
        send({ type: "error", text: e instanceof Error ? (e.name + ": " + e.message) : String(e) });
      }
    <\/script></body></html>`;

    iframe.srcdoc = html;
  });
}
