"use client";

import { useState } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/db/users";

type Props = {
  profiles: Profile[];
};

export default function StudentPicker({ profiles }: Props) {
  const [search, setSearch] = useState("");

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.display_name.toLowerCase().includes(q) ||
      (p.student_number !== null && String(p.student_number).includes(q))
    );
  });

  const sorted = [...filtered].sort(
    (a, b) => (a.student_number ?? Infinity) - (b.student_number ?? Infinity)
  );

  return (
    <div className="space-y-4">
      {/* 検索行 */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="表示名・学籍番号で検索..."
          className="flex-1 min-w-40 max-w-md border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="text-xs text-muted-foreground">{sorted.length}人</span>
        {search !== "" && (
          <button
            onClick={() => setSearch("")}
            className="text-xs px-3 py-2 rounded-md border hover:bg-muted transition-colors"
          >
            リセット
          </button>
        )}
      </div>

      {/* 生徒リスト */}
      {sorted.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm border rounded-md">
          該当する生徒がいません
        </div>
      ) : (
        <div className="rounded-md border divide-y overflow-hidden">
          {sorted.map((p) => (
            <Link
              key={p.id}
              href={`/teacher/students/${p.id}`}
              className="flex items-center justify-between px-4 py-2.5 bg-card hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 transition-colors group"
            >
              <div className="min-w-0">
                <span className="font-mono text-xs text-muted-foreground mr-3 shrink-0">
                  {p.student_number ?? "—"}
                </span>
                <span className="text-sm font-medium truncate">{p.display_name}</span>
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="w-4 h-4 text-muted-foreground group-hover:text-indigo-500 transition-colors shrink-0"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
