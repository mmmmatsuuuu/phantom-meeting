import Link from "next/link";
import type { NextAction } from "@/lib/student-dashboard";

type Props = {
  actions: NextAction[];
};

export default function NextActions({ actions }: Props) {
  if (actions.length === 0) return null;

  return (
    <div className="bg-card border rounded-xl p-4">
      <h2 className="text-sm font-semibold mb-3">つぎにやること</h2>
      <div className="space-y-2">
        {actions.map((action) => (
          <Link
            key={`${action.type}-${action.lessonId}`}
            href={`/lessons/${action.lessonId}`}
            className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-background hover:border-indigo-400 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {action.type === "review" ? (
                <span className="shrink-0 text-base">⚠️</span>
              ) : (
                <span className="shrink-0 text-base">▶️</span>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{action.lessonTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {action.type === "review" ? (
                    <>
                      直近{" "}
                      <span className="text-red-500 font-semibold">
                        {action.latestRate}%
                      </span>{" "}
                      — もう一度挑戦しよう
                    </>
                  ) : (
                    "続きから — まだ小テストを受けていません"
                  )}
                </p>
              </div>
            </div>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-4 h-4 text-muted-foreground group-hover:text-indigo-500 transition-colors shrink-0"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
