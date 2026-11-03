"use client";

import type { QuizWithQuestions } from "@/lib/db/quizzes";
import type { CodeSnippet, StudentCodeStateEntry } from "@/lib/db/code-snippets";
import type { TiptapDoc } from "@/lib/tiptap-utils";
import LessonTabs from "@/components/lesson/lesson-tabs";
import LessonSidePanel from "@/components/lesson/lesson-side-panel";

type Props = {
  lessonId: string;
  youtubeUrl: string;
  quiz: QuizWithQuestions | null;
  template: TiptapDoc | null;
  /** このレッスン以外で要復習のレッスン数（提出後ナッジ用） */
  otherReviewCount?: number;
  enablePlayground?: boolean;
  codeSnippets?: CodeSnippet[];
  initialCodeStates?: Record<string, StudentCodeStateEntry>;
};

/** 左に動画と小テスト、右にノート（とコード）を並べる。PC での利用が前提（docs/design.md） */
export default function LessonContent({
  lessonId,
  youtubeUrl,
  quiz,
  template,
  otherReviewCount = 0,
  enablePlayground = false,
  codeSnippets = [],
  initialCodeStates = {},
}: Props) {
  return (
    <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-8 items-start">
      <LessonTabs
        youtubeUrl={youtubeUrl}
        quiz={quiz}
        otherReviewCount={otherReviewCount}
        enablePlayground={enablePlayground}
      />
      <LessonSidePanel
        lessonId={lessonId}
        template={template}
        enablePlayground={enablePlayground}
        snippets={codeSnippets}
        initialCodeStates={initialCodeStates}
      />
    </div>
  );
}
