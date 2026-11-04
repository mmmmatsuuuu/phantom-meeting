import { notFound } from "next/navigation";
import Link from "next/link";
import { getLessonWithUnit } from "@/lib/db/contents";
import { getQuizWithQuestions, getStudentQuizStatuses, isReviewNeeded } from "@/lib/db/quizzes";
import { getMemoTemplate } from "@/lib/db/memo-templates";
import {
  getCodeSnippetsByLesson,
  getStudentCodeStatesByLesson,
} from "@/lib/db/code-snippets";
import { getUserProfile } from "@/lib/supabase/server";
import LessonContent from "@/components/lesson/lesson-content";

type Props = {
  params: Promise<{ lessonId: string }>;
};

export default async function LessonPage({ params }: Props) {
  const { lessonId } = await params;

  const [lesson, quiz, profile, template] = await Promise.all([
    getLessonWithUnit(lessonId),
    getQuizWithQuestions(lessonId),
    getUserProfile(),
    getMemoTemplate(lessonId),
  ]);

  if (!lesson) return notFound();
  if (!profile) return notFound();

  const [statuses, codeSnippets, initialCodeStates] = await Promise.all([
    // 小テストを出したあとに、ほかに見直すべきレッスンがあるかを伝えるため、自分の受験状況を取得する
    getStudentQuizStatuses(profile.userId),
    // プレイグラウンドが有効なレッスンのみ、コード例と自分の編集内容を取得
    lesson.enable_playground ? getCodeSnippetsByLesson(lessonId) : Promise.resolve([]),
    lesson.enable_playground
      ? getStudentCodeStatesByLesson(lessonId, profile.userId)
      : Promise.resolve({}),
  ]);
  const otherReviewCount = statuses.filter(
    (s) => s.quizId !== quiz?.id && isReviewNeeded(s)
  ).length;

  const { unit } = lesson;

  return (
    <div className="max-w-[1240px] mx-auto px-4 pt-5 pb-16">
      <nav className="text-[13px] text-muted-foreground">
        <Link href="/" className="underline underline-offset-2 hover:text-foreground transition-colors">
          {unit.name}
        </Link>
      </nav>
      <h1 className="font-hand font-semibold text-[28px] leading-normal mb-4">{lesson.title}</h1>

      <LessonContent
        lessonId={lessonId}
        youtubeUrl={lesson.youtube_url}
        quiz={quiz}
        template={template}
        otherReviewCount={otherReviewCount}
        enablePlayground={lesson.enable_playground}
        codeSnippets={codeSnippets}
        initialCodeStates={initialCodeStates}
      />
    </div>
  );
}
