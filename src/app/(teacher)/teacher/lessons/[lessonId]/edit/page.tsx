import { notFound } from "next/navigation";
import Link from "next/link";
import { getLessonWithUnit } from "@/lib/db/contents";
import LessonEditForm from "@/components/teacher/lesson-edit-form";

type Props = {
  params: Promise<{ lessonId: string }>;
};

export default async function LessonEditPage({ params }: Props) {
  const { lessonId } = await params;
  const lesson = await getLessonWithUnit(lessonId);

  if (!lesson) return notFound();

  const contentsHref = `/teacher/contents/${lesson.unit.subject_id}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
        <Link href={contentsHref} className="hover:text-foreground transition-colors">
          コンテンツ管理
        </Link>
        <span>/</span>
        <span>{lesson.unit.subject.name}</span>
        <span>/</span>
        <span>{lesson.unit.name}</span>
        <span>/</span>
        <span className="text-foreground font-medium">レッスンを編集</span>
      </nav>

      <h1 className="font-hand font-semibold text-2xl mb-6">レッスンを編集する</h1>

      <LessonEditForm
        lessonId={lessonId}
        initialTitle={lesson.title}
        initialYoutubeUrl={lesson.youtube_url}
        returnHref={contentsHref}
      />
    </div>
  );
}
