/**
 * 教師向け分析画面で共通に使う、正答率・得点率の段階と色（Tailwind のクラス）。
 * 段階の境目は 40% / 70% / 90%。
 */

/** 正答率の段階。上から順に判定する（min 以上ならその段階） */
export const RATE_LEVELS = [
  {
    min: 0.9,
    label: "90%以上",
    tile: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  {
    min: 0.7,
    label: "70〜90%",
    tile: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300",
    bar: "bg-yellow-400",
    text: "text-yellow-700 dark:text-yellow-400",
  },
  {
    min: 0.4,
    label: "40〜70%",
    tile: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
    bar: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-400",
  },
  {
    min: 0,
    label: "40%未満",
    tile: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
    bar: "bg-red-500",
    text: "text-red-700 dark:text-red-400",
  },
] as const;

/** 回答がない・自動採点しない場合 */
export const NO_DATA_LEVEL = {
  label: "N/A・未受験",
  tile: "bg-muted text-muted-foreground",
  bar: "bg-muted-foreground/30",
  text: "text-muted-foreground",
} as const;

export type RateLevel = (typeof RATE_LEVELS)[number] | typeof NO_DATA_LEVEL;

/** 0〜1 の率から段階を返す。null は NO_DATA_LEVEL */
export function levelOf(rate: number | null): RateLevel {
  if (rate === null) return NO_DATA_LEVEL;
  return RATE_LEVELS.find((l) => rate >= l.min) ?? RATE_LEVELS[RATE_LEVELS.length - 1];
}

/** 0〜1 の率を「79%」の形にする。null は「N/A」 */
export function formatRate(rate: number | null): string {
  return rate === null ? "N/A" : `${Math.round(rate * 100)}%`;
}
