import type { Question } from "@/lib/db/contents";

type Props = {
  questions: Question[];
};

export default function QuestionSection({ questions }: Props) {
  if (questions.length === 0) return null;

  return (
    <div>
      <h2 className="text-base font-semibold mb-3">❓ 発問</h2>
      <div className="space-y-2">
        {questions.map((q, i) => (
          <div key={q.id} className="p-3 rounded-md border bg-card">
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              Q{i + 1}
            </p>
            <p className="text-sm leading-relaxed">{q.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
