import { redirect } from "next/navigation";

// 旧URL。分析ページのタブ統合（Phase 20c）で /teacher/analytics 配下へ移設した
export default function QuizAnalyticsRedirectPage() {
  redirect("/teacher/analytics/units");
}
