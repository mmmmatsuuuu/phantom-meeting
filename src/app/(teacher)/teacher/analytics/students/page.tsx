import { getContents } from "@/lib/db/contents";
import StudentAnalytics from "@/components/teacher/student-analytics";

export default async function StudentAnalyticsPage() {
  const subjects = await getContents();

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        生徒×レッスンの最新得点率をヒートマップで表示します。生徒名をクリックすると個人詳細を確認できます
      </p>
      <StudentAnalytics subjects={subjects} />
    </div>
  );
}
