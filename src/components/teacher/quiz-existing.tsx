"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { QuizWithQuestions } from "@/lib/db/quizzes";
import RichContent from "@/components/shared/rich-content";

const QUESTION_TYPE_LABELS = {
  multiple_choice: "選択式",
  short_answer: "記述式",
  ordering: "並び替え",
} as const;

type Props = {
  quiz: QuizWithQuestions;
};

export default function QuizExisting({ quiz }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("このクイズを削除しますか？問題もすべて削除されます。")) return;

    setDeleting(true);
    const res = await fetch(`/api/quizzes/${quiz.id}`, { method: "DELETE" });
    setDeleting(false);

    if (res.ok) {
      toast.success("クイズを削除しました");
      router.refresh();
    } else {
      toast.error("削除に失敗しました");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{quiz.title}</h2>
          <p className="text-sm text-muted-foreground">{quiz.questions.length} 問</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="shrink-0 text-sm px-3 py-1.5 rounded-md border text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
        >
          {deleting ? "削除中..." : "🗑️ クイズを削除"}
        </button>
      </div>

      <div className="space-y-3">
        {quiz.questions.map((q, i) => (
          <div key={q.id} className="border rounded-lg p-4 space-y-2 bg-card">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">問題 {i + 1}</span>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {QUESTION_TYPE_LABELS[q.type]}
              </span>
            </div>
            <RichContent content={q.content as Record<string, unknown>} />
          </div>
        ))}
      </div>
    </div>
  );
}
