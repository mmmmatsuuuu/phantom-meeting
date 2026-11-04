import { describe, expect, it } from "vitest";
import {
  collectImageSrcs,
  findDisallowedImages,
  isTiptapDoc,
  isWithinNoteSize,
  MAX_NOTE_BYTES,
  textToTiptapDoc,
  tiptapDocToText,
} from "@/lib/tiptap-utils";

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

describe("isTiptapDoc", () => {
  it("最上位が doc で content が配列なら文書とみなす", () => {
    expect(isTiptapDoc({ type: "doc", content: [] })).toBe(true);
  });

  it("それ以外は文書とみなさない", () => {
    expect(isTiptapDoc(null)).toBe(false);
    expect(isTiptapDoc("doc")).toBe(false);
    expect(isTiptapDoc({ type: "paragraph", content: [] })).toBe(false);
    expect(isTiptapDoc({ type: "doc" })).toBe(false);
  });
});

describe("isWithinNoteSize", () => {
  const docOfBytes = (bytes: number) => {
    const empty = { type: "doc", content: [{ type: "text", text: "" }] };
    const overhead = JSON.stringify(empty).length;
    return { type: "doc", content: [{ type: "text", text: "a".repeat(bytes - overhead) }] };
  };

  it("上限ちょうどまでは収まる", () => {
    expect(isWithinNoteSize(docOfBytes(MAX_NOTE_BYTES))).toBe(true);
  });

  it("上限を 1 バイトでも超えると収まらない", () => {
    expect(isWithinNoteSize(docOfBytes(MAX_NOTE_BYTES + 1))).toBe(false);
  });

  it("日本語は 1 文字 3 バイトで数える", () => {
    const text = "あ".repeat(Math.floor(MAX_NOTE_BYTES / 3));
    expect(isWithinNoteSize({ type: "doc", content: [{ type: "text", text }] })).toBe(false);
  });
});

const image = (src: unknown) => ({ type: "image", attrs: { src } });

describe("collectImageSrcs", () => {
  it("入れ子の中も含めて、画像の src を出てきた順に返す", () => {
    const doc = {
      type: "doc",
      content: [
        image("a.png"),
        { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [image("b.png")] }] }] },
      ],
    };
    expect(collectImageSrcs(doc)).toEqual(["a.png", "b.png"]);
  });

  it("src が文字列でない画像は空文字として数える", () => {
    expect(collectImageSrcs({ type: "doc", content: [image(1), { type: "image" }] })).toEqual(["", ""]);
  });
});

describe("findDisallowedImages", () => {
  it("ひな形にない画像だけを返す", () => {
    const doc = { type: "doc", content: [image("t.png"), image("https://evil.example/x.png")] };
    expect(findDisallowedImages(doc, ["t.png"])).toEqual(["https://evil.example/x.png"]);
  });

  it("画像がなければ空", () => {
    expect(findDisallowedImages({ type: "doc", content: [] }, [])).toEqual([]);
  });

  it("ひな形がなければ、どの画像も許可しない", () => {
    expect(findDisallowedImages({ type: "doc", content: [image("t.png")] }, [])).toEqual(["t.png"]);
  });
});
