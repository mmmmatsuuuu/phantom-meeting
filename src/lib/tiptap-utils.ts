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
