import { describe, expect, it } from "vitest";
import { sortUnitsNewestFirst } from "@/lib/contents-order";

describe("sortUnitsNewestFirst", () => {
  it("order の大きい単元を上にする", () => {
    const units = [
      { id: "a", order: 0, created_at: "2026-04-01T00:00:00Z" },
      { id: "b", order: 2, created_at: "2026-06-01T00:00:00Z" },
      { id: "c", order: 1, created_at: "2026-05-01T00:00:00Z" },
    ];
    expect(sortUnitsNewestFirst(units).map((u) => u.id)).toEqual(["b", "c", "a"]);
  });

  it("order が重複したら作成日時の新しい方を上にする", () => {
    const units = [
      { id: "old", order: 1, created_at: "2026-05-01T00:00:00Z" },
      { id: "new", order: 1, created_at: "2026-07-01T00:00:00Z" },
      { id: "first", order: 0, created_at: "2026-04-01T00:00:00Z" },
    ];
    expect(sortUnitsNewestFirst(units).map((u) => u.id)).toEqual(["new", "old", "first"]);
  });

  it("元の配列を変更しない", () => {
    const units = [
      { id: "a", order: 0, created_at: "2026-04-01T00:00:00Z" },
      { id: "b", order: 1, created_at: "2026-05-01T00:00:00Z" },
    ];
    sortUnitsNewestFirst(units);
    expect(units.map((u) => u.id)).toEqual(["a", "b"]);
  });
});
