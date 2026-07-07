import { notFound } from "next/navigation";
import Link from "next/link";
import { getLessonWithQuestions } from "@/lib/db/contents";
import { getQuizWithQuestions, getStudentQuizStatuses, isReviewNeeded } from "@/lib/db/quizzes";
import { getMemoCountsByLesson } from "@/lib/db/memos";
import { getUserProfile } from "@/lib/supabase/server";
import LessonContent from "@/components/lesson/lesson-content";
import LessonStatusBar from "@/components/lesson/lesson-status-bar";

type Props = {
  params: Promise<{ lessonId: string }>;
};

export default async function LessonPage({ params }: Props) {
  const { lessonId } = await params;

  const [lesson, quiz, profile] = await Promise.all([
    getLessonWithQuestions(lessonId),
    getQuizWithQuestions(lessonId),
    getUserProfile(),
  ]);

  if (!lesson) return notFound();
  if (!profile) return notFound();

  // 自分の受験状況・メモ件数を取得（ステータスバー・ナッジ用）
  // 全ロールで表示する（教師が生徒向けの表示を確認できるようにするため）
  const [statuses, memoCounts] = await Promise.all([
    getStudentQuizStatuses(profile.userId),
    getMemoCountsByLesson(profile.userId),
  ]);
  const current = quiz ? statuses.find((s) => s.quizId === quiz.id) : undefined;
  const initialIsCompleted = current !== undefined;
  const otherReviewCount = statuses.filter(
    (s) => s.quizId !== quiz?.id && isReviewNeeded(s)
  ).length;
  const statusBar = {
    latestRate: current?.latestRate ?? null,
    attemptCount: current?.attemptCount ?? 0,
    memoCount: memoCounts[lessonId] ?? 0,
  };

  const { unit, questions } = lesson;
  const subject = unit.subject;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* パンくずリスト */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
        <Link href="/" className="hover:text-foreground transition-colors">
          📺 レッスン一覧
        </Link>
        <span>/</span>
        <span>{subject.name}</span>
        <span>/</span>
        <span>{unit.name}</span>
        <span>/</span>
        <span className="text-foreground font-medium">{lesson.title}</span>
      </nav>

      <h1 className="text-xl font-bold mb-3">{lesson.title}</h1>

      <LessonStatusBar
        hasQuiz={quiz !== null}
        latestRate={statusBar.latestRate}
        attemptCount={statusBar.attemptCount}
        memoCount={statusBar.memoCount}
      />

      <LessonContent
        lessonId={lessonId}
        youtubeUrl={lesson.youtube_url}
        questions={questions}
        quiz={quiz}
        currentUserId={profile.userId}
        currentUserRole={profile.role}
        initialIsCompleted={initialIsCompleted}
        otherReviewCount={otherReviewCount}
      />
    </div>
  );
}
