import { describe, expect, it } from "vitest";
import { buildMakerRoster, filterRosterByClass } from "./maker-roster";

const profile = (id: string, student_number: number | null, role = "student") => ({
  id,
  display_name: id,
  student_number,
  role,
});
const T1 = "2026-11-01T01:00:00+00:00";
const T2 = "2026-11-01T02:00:00.000Z";

describe("buildMakerRoster", () => {
  it("提出・公開停止・下書き・未着手を判定する", () => {
    const roster = buildMakerRoster(
      [profile("a", 1101), profile("b", 1102), profile("c", 1103), profile("d", 1104)],
      [{ user_id: "c", title: "下書き", updated_at: T1 }],
      [
        { user_id: "a", title: "作品A", submitted_at: T1, hidden_at: null },
        { user_id: "b", title: "作品B", submitted_at: T1, hidden_at: T2 },
      ]
    );
    expect(roster.map((r) => r.status)).toEqual(["submitted", "hidden", "draft", "not_started"]);
    expect(roster.map((r) => r.title)).toEqual(["作品A", "作品B", "下書き", ""]);
  });

  it("提出後に更新された下書きだけを未提出の変更ありとする", () => {
    const roster = buildMakerRoster(
      [profile("a", 1101), profile("b", 1102)],
      [
        { user_id: "a", title: "x", updated_at: T2 },
        { user_id: "b", title: "x", updated_at: T1 },
      ],
      [
        { user_id: "a", title: "x", submitted_at: T1, hidden_at: null },
        { user_id: "b", title: "x", submitted_at: T2, hidden_at: null },
      ]
    );
    expect(roster.map((r) => r.hasUnsubmittedChanges)).toEqual([true, false]);
  });

  it("生徒以外を除き、学籍番号順で未設定を最後にする", () => {
    const roster = buildMakerRoster(
      [profile("n", null), profile("t", null, "teacher"), profile("b", 1201), profile("a", 1101)],
      [],
      []
    );
    expect(roster.map((r) => r.userId)).toEqual(["a", "b", "n"]);
  });
});

describe("filterRosterByClass", () => {
  const roster = buildMakerRoster(
    [profile("a", 1101), profile("b", 1201), profile("c", 2101), profile("n", null)],
    [],
    []
  );

  it("学年と組が一致する生徒だけを返す", () => {
    expect(filterRosterByClass(roster, { grade: 1, classNum: 1 }).map((r) => r.userId)).toEqual(["a"]);
  });

  it("null なら学籍番号が未設定の生徒を返す", () => {
    expect(filterRosterByClass(roster, null).map((r) => r.userId)).toEqual(["n"]);
  });
});
