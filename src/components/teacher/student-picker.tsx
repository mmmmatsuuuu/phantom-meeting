"use client";

import { useState } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/db/users";
import { classOf, gradeOf } from "@/lib/student-number";

type Props = {
  profiles: Profile[];
};

/** 学籍番号（GCNN）を「2年3組15番」の形にする */
function formatStudentNumber(n: number): string {
  return `${gradeOf(n)}年${classOf(n)}組${n % 100}番`;
}

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
    <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* 検索 */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b bg-muted/30">
        <div className="relative flex-1 min-w-40 max-w-md">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="表示名・学籍番号で検索..."
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {search !== "" && (
          <button
            onClick={() => setSearch("")}
            className="text-xs px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors"
          >
            リセット
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {sorted.length}人
        </span>
      </div>

      {/* 生徒リスト */}
      {sorted.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground text-sm">
          該当する生徒がいません
        </div>
      ) : (
        <ul className="divide-y">
          {sorted.map((p) => (
            <li key={p.id}>
              <Link
                href={`/teacher/students/${p.id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors group"
              >
                <span className="font-mono text-xs text-muted-foreground tabular-nums w-12 shrink-0">
                  {p.student_number ?? "—"}
                </span>
                <span className="text-sm font-medium truncate">{p.display_name}</span>
                {p.student_number !== null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                    {formatStudentNumber(p.student_number)}
                  </span>
                )}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="ml-auto w-4 h-4 text-muted-foreground group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
