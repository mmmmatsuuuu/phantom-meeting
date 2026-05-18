import { getContents } from "@/lib/db/contents";
import QuizAnalytics from "@/components/teacher/quiz-analytics";

export default async function QuizAnalyticsPage() {
  const subjects = await getContents();

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">小テスト分析</h1>
        <p className="text-muted-foreground text-sm mt-1">
          学年・クラス・科目を選択すると、授業ごとの設問別平均正答率をヒートマップで表示します
        </p>
      </div>
      <QuizAnalytics subjects={subjects} />
    </div>
  );
}
