import { cookies } from "next/headers";
import { getContents } from "@/lib/db/contents";
import { createClient } from "@/lib/supabase/server";
import SubjectList from "@/components/lesson/subject-list";

export default async function HomePage() {
  const [subjects, supabase, cookieStore] = await Promise.all([
    getContents(),
    createClient(),
    cookies(),
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

  // cookie から折りたたまれている科目IDを取得
  let initialCollapsedIds: string[] = [];
  try {
    const raw = cookieStore.get("lesson_subjects_collapsed")?.value;
    if (raw) {
      const parsed = JSON.parse(decodeURIComponent(raw)) as string[];
      if (Array.isArray(parsed)) initialCollapsedIds = parsed;
    }
  } catch {
    // ignore parse errors
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
          <SubjectList
            subjects={subjects}
            initialCollapsedIds={initialCollapsedIds}
          />
        )}
      </div>
    </div>
  );
}
