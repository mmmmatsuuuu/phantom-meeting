import Link from "next/link";
import type { DashboardSummary } from "@/lib/student-dashboard";

type Props = {
  summary: DashboardSummary;
};

function rateColor(rate: number): string {
  if (rate >= 80) return "text-green-600";
  if (rate >= 60) return "text-amber-600";
  return "text-red-500";
}

export default function DashboardSummaryCards({ summary }: Props) {
  const cards = [
    {
      label: "小テスト",
      value: `${summary.attemptedQuizCount}/${summary.totalQuizCount}`,
      sub: "受験",
      href: "/quiz-results",
      valueClass: "",
    },
    {
      label: "平均得点率",
      value: summary.avgRate !== null ? `${summary.avgRate}%` : "—",
      sub: "最新受験の平均",
      href: "/quiz-results",
      valueClass: summary.avgRate !== null ? rateColor(summary.avgRate) : "",
    },
    {
      label: "要復習",
      value: `${summary.reviewCount}`,
      sub: "レッスン",
      href: "/quiz-results",
      valueClass: summary.reviewCount > 0 ? "text-red-500" : "text-green-600",
    },
    {
      label: "メモ",
      value: `${summary.memoCount}`,
      sub: "件",
      href: "/memos",
      valueClass: "",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          className="bg-card border rounded-xl p-4 hover:border-indigo-400 hover:shadow-sm transition-all group"
        >
          <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
          <p className={`text-2xl font-bold ${card.valueClass}`}>
            {card.value}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              {card.sub}
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            くわしく見る →
          </p>
        </Link>
      ))}
    </div>
  );
}
