import { getLessonWithQuestions } from "@/lib/db/contents";
import StudentMemoViewer from "@/components/teacher/student-memo-viewer";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ lessonId: string }> };

export default async function TeacherLessonMemosPage({ params }: Props) {
  const { lessonId } = await params;
  const lesson = await getLessonWithQuestions(lessonId);
  if (!lesson) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-1">生徒メモ閲覧</p>
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
      </div>
      <StudentMemoViewer lessonId={lessonId} />
    </div>
  );
}
