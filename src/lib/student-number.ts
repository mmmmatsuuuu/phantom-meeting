/**
 * 学籍番号は GCNN 形式（G=学年、C=クラス、NN=出席番号）。例: 2315 = 2年3組15番
 */

/** 学年・クラスに該当する学籍番号の範囲（両端を含む）を返す。classNum が "all" なら学年全体 */
export function studentNumberRange(
  grade: number,
  classNum: number | "all"
): { min: number; max: number } {
  if (classNum === "all") {
    return { min: grade * 1000, max: grade * 1000 + 999 };
  }
  const min = grade * 1000 + classNum * 100;
  return { min, max: min + 99 };
}
