import { getContents } from "@/lib/db/contents";
import LessonAnalytics from "@/components/teacher/lesson-analytics";

export default async function LessonAnalyticsPage() {
  const subjects = await getContents();

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        レッスンを選択すると、設問ごとの正答率・回答分布・記述回答サンプル・メモ記入状況を表示します
      </p>
      <LessonAnalytics subjects={subjects} />
    </div>
  );
}
