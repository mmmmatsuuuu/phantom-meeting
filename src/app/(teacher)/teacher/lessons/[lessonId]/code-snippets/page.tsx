import { notFound } from "next/navigation";
import Link from "next/link";
import { getLessonWithQuestions } from "@/lib/db/contents";
import { getCodeSnippetsByLesson } from "@/lib/db/code-snippets";
import CodeSnippetsManager from "@/components/teacher/code-snippets-manager";

type Props = {
  params: Promise<{ lessonId: string }>;
};

export default async function CodeSnippetsPage({ params }: Props) {
  const { lessonId } = await params;

  const [lesson, snippets] = await Promise.all([
    getLessonWithQuestions(lessonId),
    getCodeSnippetsByLesson(lessonId),
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
        <span className="text-foreground font-medium">コーディングプレイグラウンド</span>
      </nav>

      <h1 className="text-xl font-bold mb-6">💻 プレイグラウンド管理 — {lesson.title}</h1>

      <CodeSnippetsManager
        lessonId={lessonId}
        initialEnabled={lesson.enable_playground}
        initialSnippets={snippets}
      />
    </div>
  );
}
