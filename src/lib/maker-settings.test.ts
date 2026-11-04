import { describe, expect, it } from "vitest";
import { listMakerClasses, parseMakerSettings, resolveGalleryClass } from "./maker-settings";

describe("parseMakerSettings", () => {
  it("空や不正な値は空の設定にする", () => {
    const empty = { prompts: [], examples: [], starterCode: "" };
    expect(parseMakerSettings(null)).toEqual(empty);
    expect(parseMakerSettings("x")).toEqual(empty);
    expect(parseMakerSettings({ prompts: "x", examples: 1, starterCode: 2 })).toEqual(empty);
  });

  it("欠けた項目を空文字で補い、オブジェクト以外の要素を除く", () => {
    expect(
      parseMakerSettings({
        prompts: [{ title: "案出し" }, "x", null],
        examples: [{ title: "じゃんけん", code: "print(1)" }],
        starterCode: "# 開始",
      })
    ).toEqual({
      prompts: [{ title: "案出し", body: "" }],
      examples: [{ title: "じゃんけん", description: "", code: "print(1)" }],
      starterCode: "# 開始",
    });
  });
});

describe("listMakerClasses", () => {
  it("重複と未設定を除き、学年・組の順に並べる", () => {
    expect(listMakerClasses([2315, 1101, null, 1102, 1201])).toEqual([
      { grade: 1, classNum: 1 },
      { grade: 1, classNum: 2 },
      { grade: 2, classNum: 3 },
    ]);
  });

  it("GCNN 形式でない番号を除く", () => {
    expect(listMakerClasses([5, 4101, 1001, 99999])).toEqual([]);
  });
});

describe("resolveGalleryClass", () => {
  it("URL の学年・組が正しければそれを使う", () => {
    expect(resolveGalleryClass({ grade: "2", class: "3" }, 1101)).toEqual({ grade: 2, classNum: 3 });
  });

  it("URL の指定がない・不正なら、閲覧している生徒のクラス", () => {
    expect(resolveGalleryClass({}, 1205)).toEqual({ grade: 1, classNum: 2 });
    expect(resolveGalleryClass({ grade: "4", class: "1" }, 2315)).toEqual({ grade: 2, classNum: 3 });
    expect(resolveGalleryClass({ grade: "1", class: "x" }, 2315)).toEqual({ grade: 2, classNum: 3 });
  });

  it("学籍番号もなければ 1年1組", () => {
    expect(resolveGalleryClass({}, null)).toEqual({ grade: 1, classNum: 1 });
    expect(resolveGalleryClass({}, 5)).toEqual({ grade: 1, classNum: 1 });
  });
});
