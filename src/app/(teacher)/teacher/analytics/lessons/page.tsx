import { getContents } from "@/lib/db/contents";
import LessonAnalytics from "@/components/teacher/lesson-analytics";

export default async function LessonAnalyticsPage() {
  const subjects = await getContents();

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        レッスンを選択すると、小テストの回答・コーディングプレイグラウンドの実行状況・メモを、生徒ごとにタブで確認できます
      </p>
      <LessonAnalytics subjects={subjects} />
    </div>
  );
}
