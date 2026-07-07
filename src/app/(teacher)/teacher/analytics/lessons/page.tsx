import { getContents } from "@/lib/db/contents";
import LessonAnalytics from "@/components/teacher/lesson-analytics";

export default async function LessonAnalyticsPage() {
  const subjects = await getContents();

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        レッスンを選択すると、生徒ごとの設問別の正誤・誤答内容・記述回答・メモ記入状況を一覧表示します
      </p>
      <LessonAnalytics subjects={subjects} />
    </div>
  );
}
