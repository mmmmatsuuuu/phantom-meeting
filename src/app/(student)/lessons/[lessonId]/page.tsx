import { notFound } from "next/navigation";
import Link from "next/link";
import { getLessonWithQuestions } from "@/lib/db/contents";
import { getQuizWithQuestions, hasCompletedQuiz } from "@/lib/db/quizzes";
import { getUserProfile } from "@/lib/supabase/server";
import LessonContent from "@/components/lesson/lesson-content";

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

  const initialIsCompleted = quiz
    ? await hasCompletedQuiz(quiz.id, profile.userId)
    : false;

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

      <h1 className="text-xl font-bold mb-5">{lesson.title}</h1>

      <LessonContent
        lessonId={lessonId}
        youtubeUrl={lesson.youtube_url}
        questions={questions}
        quiz={quiz}
        currentUserId={profile.userId}
        currentUserRole={profile.role}
        initialIsCompleted={initialIsCompleted}
      />
    </div>
  );
}
