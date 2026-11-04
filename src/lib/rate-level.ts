/**
 * 教師向け分析画面で共通に使う、正答率・得点率の段階と色（Tailwind のクラス）。
 * 段階の境目は 40% / 70% / 90%。
 * 色はインクの濃さで表し（高いほど濃い）、40% 未満だけを気をつけるところとして赤ペンにする（docs/design.md の「配色」）
 */

/** 正答率の段階。上から順に判定する（min 以上ならその段階） */
export const RATE_LEVELS = [
  {
    min: 0.9,
    label: "90%以上",
    tile: "bg-ink text-sheet",
    bar: "bg-ink",
    text: "text-ink",
  },
  {
    min: 0.7,
    label: "70〜90%",
    tile: "bg-ink/30 text-ink",
    bar: "bg-ink/60",
    text: "text-ink",
  },
  {
    min: 0.4,
    label: "40〜70%",
    tile: "bg-ink/10 text-ink",
    bar: "bg-ink/30",
    text: "text-ink",
  },
  {
    min: 0,
    label: "40%未満",
    tile: "bg-red-pen/10 text-red-pen",
    bar: "bg-red-pen",
    text: "text-red-pen",
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
