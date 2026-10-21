import Link from "next/link";
import type { Subject } from "@/lib/db/contents";

type Props = {
  subjects: Pick<Subject, "id" | "name">[];
  currentSubjectId: string | null;
  onAddClick: () => void;
};

export default function SubjectTabs({ subjects, currentSubjectId, onAddClick }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b">
      {subjects.map((subject) => {
        const active = subject.id === currentSubjectId;
        return (
          <Link
            key={subject.id}
            href={`/teacher/contents/${subject.id}`}
            aria-current={active ? "page" : undefined}
            className={`-mb-px px-4 py-2 text-sm border-b-2 transition-colors ${
              active
                ? "border-primary font-semibold text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {subject.name}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onAddClick}
        className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ＋ 科目を追加
      </button>
    </div>
  );
}
