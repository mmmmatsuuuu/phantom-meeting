import { getAllMemos } from "@/lib/db/memos";
import { getContents } from "@/lib/db/contents";
import type { Memo } from "@/lib/db/memos";
import type { Lesson, Unit, Subject } from "@/lib/db/contents";
import MemoToc from "@/components/memos/memo-toc";
import MemoDownloadButton from "@/components/memos/memo-download-button";
import RichContent from "@/components/shared/rich-content";

type LessonWithMemos = Lesson & { memos: Memo[] };
type UnitWithMemos = Unit & { lessons: LessonWithMemos[] };
type SubjectWithMemos = Subject & { units: UnitWithMemos[] };

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function MemosPage() {
  const [allMemos, subjects] = await Promise.all([getAllMemos(), getContents()]);

  // lessonId → Memo[] のマップを構築
  const memosByLesson = new Map<string, Memo[]>();
  for (const memo of allMemos) {
    const list = memosByLesson.get(memo.lesson_id) ?? [];
    list.push(memo);
    memosByLesson.set(memo.lesson_id, list);
  }

  // メモが存在する科目・単元・授業のみ含むツリーを構築
  const tree: SubjectWithMemos[] = subjects
    .map((subject) => ({
      ...subject,
      units: subject.units
        .map((unit) => ({
          ...unit,
          lessons: unit.lessons
            .map((lesson) => ({
              ...lesson,
              memos: memosByLesson.get(lesson.id) ?? [],
            }))
            .filter((lesson) => lesson.memos.length > 0),
        }))
        .filter((unit) => unit.lessons.length > 0),
    }))
    .filter((subject) => subject.units.length > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">メモ一覧</h1>

      {tree.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="w-8 h-8 text-indigo-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
          </div>
          <p className="text-muted-foreground text-sm">
            まだメモがありません。授業ページでメモを作成してみましょう。
          </p>
        </div>
      ) : (
        <div className="flex gap-8">
          {/* サイドバー目次 */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-20">
              <MemoToc subjects={tree} />
            </div>
          </aside>

          {/* メインコンテンツ */}
          <div className="flex-1 min-w-0 space-y-12">
            {tree.map((subject) => {
              const subjectSections = subject.units.flatMap((unit) =>
                unit.lessons.map((lesson) => ({
                  lessonTitle: lesson.title,
                  youtubeUrl: lesson.youtube_url,
                  memos: lesson.memos,
                }))
              );
              return (
                <section key={subject.id} id={`subject-${subject.id}`}>
                  <div className="flex items-center gap-3 mb-5 border-b pb-3">
                    <h2 className="text-xl font-bold">{subject.name}</h2>
                    <MemoDownloadButton
                      filename={`メモ_${subject.name}.md`}
                      sections={subjectSections}
                    />
                  </div>
                  <div className="space-y-10">
                    {subject.units.map((unit) => {
                      const unitSections = unit.lessons.map((lesson) => ({
                        lessonTitle: lesson.title,
                        youtubeUrl: lesson.youtube_url,
                        memos: lesson.memos,
                      }));
                      return (
                        <section key={unit.id} id={`unit-${unit.id}`}>
                          <div className="flex items-center gap-3 mb-4">
                            <h3 className="text-lg font-semibold">{unit.name}</h3>
                            <MemoDownloadButton
                              filename={`メモ_${subject.name}_${unit.name}.md`}
                              sections={unitSections}
                            />
                          </div>
                          <div className="space-y-6">
                            {unit.lessons.map((lesson) => (
                              <section key={lesson.id} id={`lesson-${lesson.id}`}>
                                <div className="flex items-center gap-3 mb-3">
                                  <h4 className="font-medium">{lesson.title}</h4>
                                  <MemoDownloadButton
                                    filename={`メモ_${subject.name}_${unit.name}_${lesson.title}.md`}
                                    sections={[
                                      {
                                        lessonTitle: lesson.title,
                                        youtubeUrl: lesson.youtube_url,
                                        memos: lesson.memos,
                                      },
                                    ]}
                                  />
                                </div>
                                {lesson.youtube_url && (
                                  <a
                                    href={lesson.youtube_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-indigo-600 hover:underline block mb-3 break-all"
                                  >
                                    {lesson.youtube_url}
                                  </a>
                                )}
                                <div className="space-y-3 pl-4 border-l-2 border-indigo-100">
                                  {lesson.memos.map((memo) => (
                                    <div
                                      key={memo.id}
                                      className="bg-card rounded-lg border p-4"
                                    >
                                      {memo.timestamp_seconds !== null && (
                                        <div className="text-xs text-indigo-600 font-mono mb-2">
                                          ⏱ {formatTime(memo.timestamp_seconds)}
                                        </div>
                                      )}
                                      <RichContent
                                        content={
                                          memo.content as unknown as Record<
                                            string,
                                            unknown
                                          >
                                        }
                                      />
                                    </div>
                                  ))}
                                </div>
                              </section>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
