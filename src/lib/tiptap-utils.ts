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

export type TiptapDoc = { type: "doc"; content: unknown[] };

/** tiptap の文書 JSON（最上位が type: "doc" で content が配列）かどうか */
export function isTiptapDoc(value: unknown): value is TiptapDoc {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return obj.type === "doc" && Array.isArray(obj.content);
}

/**
 * ノートとひな形の大きさの上限（JSON にしたときのバイト数）。
 * 動画 1 本分を詰めて書いたプリント（約 150 ブロック・40KB 前後）に、生徒の書き足しやコードを加えても十分に収まる。
 * 教師の画面はクラス全員分のノートを一度に取得するため、上限を設けて転送量を抑える
 */
export const MAX_NOTE_BYTES = 256 * 1024;

/** 文書が大きさの上限に収まっているか */
export function isWithinNoteSize(doc: unknown): boolean {
  return new TextEncoder().encode(JSON.stringify(doc)).length <= MAX_NOTE_BYTES;
}

/** 文書に含まれる画像の src を、出てきた順にすべて返す */
export function collectImageSrcs(node: unknown): string[] {
  if (!node || typeof node !== "object") return [];
  const obj = node as Record<string, unknown>;
  const srcs: string[] = [];
  if (obj.type === "image") {
    const attrs = obj.attrs as Record<string, unknown> | undefined;
    srcs.push(typeof attrs?.src === "string" ? attrs.src : "");
  }
  if (Array.isArray(obj.content)) {
    for (const child of obj.content) srcs.push(...collectImageSrcs(child));
  }
  return srcs;
}

/**
 * ノートに含まれる画像のうち、許可されていないもの（ひな形にない画像）を返す。
 * 生徒のノートで使える画像は、教師がひな形に入れたものだけにする（docs/design.md）
 */
export function findDisallowedImages(doc: unknown, allowedSrcs: string[]): string[] {
  const allowed = new Set(allowedSrcs);
  return collectImageSrcs(doc).filter((src) => !allowed.has(src));
}
