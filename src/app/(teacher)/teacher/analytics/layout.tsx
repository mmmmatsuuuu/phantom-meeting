import AnalyticsTabs from "@/components/teacher/analytics-tabs";

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">分析</h1>
        <p className="text-muted-foreground text-sm mt-1">
          小テストの結果から生徒の理解状況を多角的に分析します
        </p>
      </div>
      <div className="mb-6">
        <AnalyticsTabs />
      </div>
      {children}
    </div>
  );
}
