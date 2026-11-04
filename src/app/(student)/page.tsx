import { cookies } from "next/headers";
import { getContents } from "@/lib/db/contents";
import { getStudentQuizStatuses, getQuizLessonPairs } from "@/lib/db/quizzes";
import { getMemoCountsByLesson } from "@/lib/db/memos";
import { getMakerEventsByUnit } from "@/lib/db/maker";
import { buildStudentDashboard } from "@/lib/student-dashboard";
import type { StudentDashboard } from "@/lib/student-dashboard";
import { getUserProfile } from "@/lib/supabase/server";
import SubjectList from "@/components/lesson/subject-list";
import Mascot from "@/components/shared/mascot";

export default async function HomePage() {
  const [subjects, profile, cookieStore, makerEventsByUnit] = await Promise.all([
    getContents(),
    getUserProfile(),
    cookies(),
    getMakerEventsByUnit(),
  ]);

  // 目次の各行に出すノートの有無と小テストの得点に使う
  let dashboard: StudentDashboard | null = null;
  if (profile) {
    const [quizPairs, statuses, memoCounts] = await Promise.all([
      getQuizLessonPairs(),
      getStudentQuizStatuses(profile.userId),
      getMemoCountsByLesson(profile.userId),
    ]);
    dashboard = buildStudentDashboard(subjects, quizPairs, statuses, memoCounts);
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
    <div className="max-w-3xl mx-auto px-4 pb-16">
      {subjects.length === 0 ? (
        <div className="flex items-center gap-4 py-16">
          <Mascot pose="rest" size={96} />
          <p className="text-sm text-muted-foreground">
            レッスンがまだ登録されていません。のんびり待ちましょう。
          </p>
        </div>
      ) : (
        <SubjectList
          makerEventsByUnit={makerEventsByUnit}
          subjects={subjects}
          initialCollapsedIds={initialCollapsedIds}
          lessonBadges={dashboard?.lessonBadges}
        />
      )}
    </div>
  );
}
