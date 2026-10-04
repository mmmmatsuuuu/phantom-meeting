import { describe, expect, it } from "vitest";
import { textToTiptapDoc, tiptapDocToText } from "@/lib/tiptap-utils";

describe("tiptapDocToText", () => {
  it("段落をまたいだテキストを空白1つで連結する", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "RGB は" }] },
        { type: "paragraph", content: [{ type: "text", text: "光の三原色" }] },
      ],
    };
    expect(tiptapDocToText(doc)).toBe("RGB は 光の三原色");
  });

  it("null・空の doc は空文字を返す", () => {
    expect(tiptapDocToText(null)).toBe("");
    expect(tiptapDocToText({ type: "doc", content: [{ type: "paragraph" }] })).toBe("");
  });
});

describe("textToTiptapDoc", () => {
  it("改行ごとに段落を作り、tiptapDocToText で元のテキストに戻る", () => {
    const doc = textToTiptapDoc("1行目\n2行目");
    expect(tiptapDocToText(doc)).toBe("1行目 2行目");
  });
});
