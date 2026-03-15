import Link from "next/link";
import { getContents } from "@/lib/db/contents";
import { createClient } from "@/lib/supabase/server";

const SUBJECT_COLORS = [
  "from-indigo-500 to-indigo-600",
  "from-violet-500 to-violet-600",
  "from-sky-500 to-sky-600",
  "from-teal-500 to-teal-600",
];

export default async function HomePage() {
  const [subjects, supabase] = await Promise.all([
    getContents(),
    createClient(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let displayName = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    displayName = profile?.display_name ?? "";
  }

  return (
    <div>
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-indigo-200 text-sm mb-1">
            {displayName ? `こんにちは、${displayName} さん` : "ようこそ"}
          </p>
          <h1 className="text-2xl font-bold mb-2">今日も学習を進めましょう</h1>
          <p className="text-indigo-100 text-sm">
            動画を視聴して、発問に答え、気づきをメモしましょう。
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center mb-4">
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
                  d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125v-.375c0-.621.504-1.125 1.125-1.125h.375m17.25 0h-1.5c-.621 0-1.125-.504-1.125-1.125m1.5 1.125v-.375c0-.621-.504-1.125-1.125-1.125h-.375M6 18.375V7.875m0 0c0-.621.504-1.125 1.125-1.125h9.75c.621 0 1.125.504 1.125 1.125M6 7.875v10.5m12-10.5v10.5"
                />
              </svg>
            </div>
            <p className="text-muted-foreground text-sm">
              レッスンがまだ登録されていません。
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {subjects.map((subject, subjectIndex) => {
              const colorClass =
                SUBJECT_COLORS[subjectIndex % SUBJECT_COLORS.length];
              return (
                <div
                  key={subject.id}
                  className="rounded-xl border overflow-hidden shadow-sm"
                >
                  {/* Subject color header */}
                  <div
                    className={`bg-gradient-to-r ${colorClass} px-5 py-4 text-white`}
                  >
                    <h2 className="text-lg font-bold">{subject.name}</h2>
                  </div>

                  {/* Units + lessons */}
                  <div className="bg-card divide-y">
                    {subject.units.map((unit) => (
                      <div key={unit.id} className="px-5 py-4">
                        <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                          {unit.name}
                        </h3>
                        <div className="grid gap-2">
                          {unit.lessons.map((lesson, index) => (
                            <Link
                              key={lesson.id}
                              href={`/lessons/${lesson.id}`}
                              className="flex items-center justify-between p-3 rounded-lg border bg-background hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 hover:shadow-sm transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 shrink-0">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className="w-3.5 h-3.5 ml-0.5"
                                  >
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </span>
                                <div>
                                  <span className="text-xs text-muted-foreground mr-2">
                                    #{index + 1}
                                  </span>
                                  <span className="text-sm font-medium">
                                    {lesson.title}
                                  </span>
                                </div>
                              </div>
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                className="w-4 h-4 text-muted-foreground group-hover:text-indigo-500 transition-colors shrink-0"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
