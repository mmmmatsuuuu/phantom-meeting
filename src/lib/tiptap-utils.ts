/**
 * tiptap の doc JSON からプレーンテキストを抽出する。
 */
export function tiptapDocToText(doc: Record<string, unknown> | null | undefined): string {
  if (!doc) return "";
  return extractText(doc).replace(/\s+/g, " ").trim();
}

function extractText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const obj = node as Record<string, unknown>;
  if (obj.type === "text" && typeof obj.text === "string") return obj.text;
  if (Array.isArray(obj.content)) {
    return obj.content.map(extractText).join(" ");
  }
  return "";
}

/**
 * プレーンテキストを tiptap の paragraph ノード JSON に変換する。
 * 空文字・未定義の場合は空の doc を返す。
 */
export function textToTiptapDoc(text: string | undefined | null): Record<string, unknown> {
  const empty = { type: "doc", content: [{ type: "paragraph" }] };
  if (!text || !text.trim()) return empty;

  const paragraphs = text
    .split("\n")
    .map((line) => ({
      type: "paragraph",
      content: line.trim()
        ? [{ type: "text", text: line }]
        : undefined,
    }));

  return { type: "doc", content: paragraphs };
}
