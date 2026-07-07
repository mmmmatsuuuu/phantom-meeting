type Props = {
  hasQuiz: boolean;
  /** 最新受験の得点率（0-100）。未受験・自動採点なしは null */
  latestRate: number | null;
  attemptCount: number;
  memoCount: number;
};

function rateColor(rate: number): string {
  if (rate >= 80) return "text-green-600";
  if (rate >= 60) return "text-amber-600";
  return "text-red-500";
}

export default function LessonStatusBar({
  hasQuiz,
  latestRate,
  attemptCount,
  memoCount,
}: Props) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-muted/40 px-4 py-2.5 text-sm mb-5">
      <span className="text-xs font-medium text-muted-foreground shrink-0">
        あなたの状況
      </span>
      {hasQuiz && (
        <span className="flex items-center gap-1.5">
          🎯
          {attemptCount > 0 ? (
            <>
              直近{" "}
              {latestRate !== null ? (
                <span className={`font-bold ${rateColor(latestRate)}`}>
                  {latestRate}%
                </span>
              ) : (
                <span className="font-bold">自己採点</span>
              )}
              <span className="text-xs text-muted-foreground">
                （{attemptCount}回受験）
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">小テスト未受験</span>
          )}
        </span>
      )}
      <span className="flex items-center gap-1.5">
        📝 メモ{" "}
        <span className={`font-bold ${memoCount === 0 ? "text-muted-foreground" : ""}`}>
          {memoCount}件
        </span>
      </span>
    </div>
  );
}
