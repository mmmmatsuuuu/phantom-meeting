import { notFound } from "next/navigation";
import Link from "next/link";
import { getLessonWithQuestions } from "@/lib/db/contents";
import { getQuizWithQuestions } from "@/lib/db/quizzes";
import QuizForm from "@/components/teacher/quiz-form";
import QuizExisting from "@/components/teacher/quiz-existing";

type Props = {
  params: Promise<{ lessonId: string }>;
};

export default async function QuizNewPage({ params }: Props) {
  const { lessonId } = await params;

  const [lesson, quiz] = await Promise.all([
    getLessonWithQuestions(lessonId),
    getQuizWithQuestions(lessonId),
  ]);

  if (!lesson) return notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
        <Link href="/teacher/contents" className="hover:text-foreground transition-colors">
          コンテンツ管理
        </Link>
        <span>/</span>
        <span>{lesson.title}</span>
        <span>/</span>
        <span className="text-foreground font-medium">小テスト</span>
      </nav>

      <h1 className="text-xl font-bold mb-6">📝 小テスト管理 — {lesson.title}</h1>

      {quiz ? (
        <QuizExisting quiz={quiz} />
      ) : (
        <QuizForm lessonId={lessonId} />
      )}
    </div>
  );
}
