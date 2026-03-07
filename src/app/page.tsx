import Link from "next/link";
import {
  MOCK_SUBJECTS,
  getUnitsBySubjectId,
  getLessonsByUnitId,
} from "@/lib/mock-data";

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">🎯 今日のレッスン</h1>
        <p className="text-sm text-muted-foreground">
          動画を視聴して、❓ 発問に答え、✏️ 気づきをメモしましょう。
        </p>
      </div>

      <div className="space-y-10">
        {MOCK_SUBJECTS.map((subject) => {
          const units = getUnitsBySubjectId(subject.id);
          return (
            <div key={subject.id}>
              {/* 科目ヘッダー */}
              <div className="flex items-center gap-3 mb-5">
                <span className="w-1 h-7 bg-primary rounded-full" />
                <h2 className="text-xl font-semibold">{subject.name}</h2>
              </div>

              <div className="space-y-6 pl-4">
                {units.map((unit) => {
                  const lessons = getLessonsByUnitId(unit.id);
                  return (
                    <div key={unit.id}>
                      {/* 単元ラベル */}
                      <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">
                        {unit.name}
                      </h3>

                      {/* レッスン一覧 */}
                      <div className="space-y-1.5">
                        {lessons.map((lesson, index) => (
                          <Link
                            key={lesson.id}
                            href={`/lessons/${lesson.id}`}
                            className="flex items-center justify-between p-3 rounded-md border bg-card hover:border-primary hover:shadow-sm transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg">📺</span>
                              <div>
                                <span className="text-xs text-muted-foreground mr-2">
                                  #{index + 1}
                                </span>
                                <span className="text-sm font-medium">
                                  {lesson.title}
                                </span>
                              </div>
                            </div>
                            <span className="text-muted-foreground group-hover:text-primary transition-colors text-sm">
                              →
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
