import type { Question } from "@/lib/mock-data";

type Props = {
  questions: Question[];
};

export default function QuestionSection({ questions }: Props) {
  if (questions.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">発問</h2>
      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={q.id} className="p-4 rounded-lg border bg-card">
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">
              Q{i + 1}
            </p>
            <p className="text-sm leading-relaxed">{q.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
