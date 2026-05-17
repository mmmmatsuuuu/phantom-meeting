"use client";

import { useState } from "react";
import type { QuizAttemptResult } from "@/lib/db/quizzes";

type FrequentlyMissed = { label: string };

type Props = {
  attempts: QuizAttemptResult[];
  frequentlyMissed: FrequentlyMissed[];
};

function toRate(score: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  return Math.round((score / maxScore) * 100);
}

function rateColor(rate: number): string {
  if (rate >= 80) return "text-green-600";
  if (rate >= 60) return "text-amber-600";
  return "text-red-500";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function LessonAttemptHistory({ attempts, frequentlyMissed }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      {frequentlyMissed.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="text-xs text-muted-foreground shrink-0">間違いが多い問題:</span>
          {frequentlyMissed.map((q) => (
            <span
              key={q.label}
              className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium"
            >
              {q.label}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-90" : ""}`}
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        受験履歴 ({attempts.length}件)
      </button>

      {open && (
        <div className="space-y-2 pt-1">
          {attempts.map((attempt) => {
            const rate = toRate(attempt.score, attempt.max_score);
            const hasDetails = attempt.quiz_attempt_answers.length > 0;
            const sortedAnswers = hasDetails
              ? [...attempt.quiz_attempt_answers].sort(
                  (a, b) => a.quiz_questions.order - b.quiz_questions.order
                )
              : [];

            return (
              <div
                key={attempt.id}
                className="rounded-md border bg-muted/30 px-4 py-3 space-y-2"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatDate(attempt.submitted_at)}
                  </span>
                  {attempt.max_score > 0 ? (
                    <span className="text-sm font-medium">
                      {attempt.score} / {attempt.max_score} 点
                      <span className={`ml-1.5 font-bold ${rateColor(rate)}`}>
                        （{rate}%）
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">記述式のみ</span>
                  )}
                </div>

                {hasDetails ? (
                  <div className="flex flex-wrap gap-1.5">
                    {sortedAnswers.map((ans, i) => (
                      <span
                        key={ans.id}
                        className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded ${
                          ans.is_correct === true
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : ans.is_correct === false
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <span className="font-mono">Q{i + 1}</span>
                        <span>
                          {ans.is_correct === true ? "○" : ans.is_correct === false ? "✕" : "－"}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">詳細な回答記録なし</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
