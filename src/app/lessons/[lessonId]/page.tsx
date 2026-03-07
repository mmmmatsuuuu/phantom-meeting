import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getLessonById,
  getUnitById,
  getSubjectById,
  getQuestionsByLessonId,
  getPostsByLessonId,
  getMemosByLessonId,
} from "@/lib/mock-data";
import LessonContent from "@/components/lesson/lesson-content";

type Props = {
  params: Promise<{ lessonId: string }>;
};

export default async function LessonPage({ params }: Props) {
  const { lessonId } = await params;

  const lesson = getLessonById(lessonId);
  if (!lesson) return notFound();

  const unit = getUnitById(lesson.unit_id);
  const subject = unit ? getSubjectById(unit.subject_id) : undefined;
  const questions = getQuestionsByLessonId(lessonId);
  const posts = getPostsByLessonId(lessonId);
  const memos = getMemosByLessonId(lessonId);
  const postedMemoIds = posts.map((p) => p.memo_id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* パンくずリスト */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
        <Link href="/" className="hover:text-foreground transition-colors">
          📺 レッスン一覧
        </Link>
        {subject && (
          <>
            <span>/</span>
            <span>{subject.name}</span>
          </>
        )}
        {unit && (
          <>
            <span>/</span>
            <span>{unit.name}</span>
          </>
        )}
        <span>/</span>
        <span className="text-foreground font-medium">{lesson.title}</span>
      </nav>

      <h1 className="text-xl font-bold mb-5">{lesson.title}</h1>

      <LessonContent
        lessonId={lessonId}
        youtubeUrl={lesson.youtube_url}
        questions={questions}
        posts={posts}
        memos={memos}
        postedMemoIds={postedMemoIds}
      />
    </div>
  );
}
