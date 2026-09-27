import { getContents } from "@/lib/db/contents";
import QuizAnalytics from "@/components/teacher/quiz-analytics";

export default async function UnitAnalyticsPage() {
  const subjects = await getContents();

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        学年・クラス・科目を選択すると、授業ごとの設問別平均正答率をヒートマップで表示します（小テスト・単元・科目ごとの平均正答率も表示）
      </p>
      <QuizAnalytics subjects={subjects} />
    </div>
  );
}
