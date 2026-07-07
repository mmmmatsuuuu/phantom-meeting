"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/teacher/analytics/units", label: "単元別" },
  { href: "/teacher/analytics/lessons", label: "レッスン別" },
] as const;

export default function AnalyticsTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 p-1 bg-muted rounded-md w-fit">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              isActive
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
