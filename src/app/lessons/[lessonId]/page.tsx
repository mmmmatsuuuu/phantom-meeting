import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getLessonById,
  getUnitById,
  getSubjectById,
  getQuestionsByLessonId,
  getPostsByLessonId,
} from "@/lib/mock-data";
import VideoPlayer from "@/components/lesson/video-player";
import QuestionSection from "@/components/lesson/question-section";
import MemoSection from "@/components/lesson/memo-section";
import PostList from "@/components/lesson/post-list";

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* パンくずリスト */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
        <Link href="/" className="hover:text-foreground transition-colors">
          動画一覧
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

      <h1 className="text-xl font-bold mb-6">{lesson.title}</h1>

      {/* メインレイアウト: 左に動画＋発問、右にメモ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 space-y-6">
          <VideoPlayer youtubeUrl={lesson.youtube_url} />
          <QuestionSection questions={questions} />
        </div>
        <div className="lg:col-span-1">
          <MemoSection lessonId={lessonId} />
        </div>
      </div>

      {/* クラスの投稿 */}
      <div className="border-t pt-8">
        <PostList posts={posts} />
      </div>
    </div>
  );
}
