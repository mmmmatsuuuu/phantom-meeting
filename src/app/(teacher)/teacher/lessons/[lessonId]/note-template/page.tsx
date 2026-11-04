import { notFound } from "next/navigation";
import Link from "next/link";
import { getLessonWithUnit } from "@/lib/db/contents";
import { getMemoTemplate } from "@/lib/db/memo-templates";
import NoteTemplateEditor from "@/components/teacher/note-template-editor";

type Props = {
  params: Promise<{ lessonId: string }>;
};

export default async function NoteTemplatePage({ params }: Props) {
  const { lessonId } = await params;

  const [lesson, template] = await Promise.all([
    getLessonWithUnit(lessonId),
    getMemoTemplate(lessonId),
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
        <span className="text-foreground font-medium">ノートのひな形</span>
      </nav>

      <h1 className="font-hand font-semibold text-2xl mb-1">ノートのひな形：{lesson.title}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        生徒はこのひな形をノートに読み込み、穴を埋めたり、自由に書き換えたりします。答えは表示せず、採点もしません。
      </p>

      <NoteTemplateEditor lessonId={lessonId} initialContent={template} />
    </div>
  );
}
