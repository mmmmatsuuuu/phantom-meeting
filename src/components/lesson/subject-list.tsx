"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { SubjectWithUnits } from "@/lib/db/contents";

const SUBJECT_COLORS = [
  "from-indigo-500 to-indigo-600",
  "from-violet-500 to-violet-600",
  "from-sky-500 to-sky-600",
  "from-teal-500 to-teal-600",
];

const COOKIE_KEY = "lesson_subjects_collapsed";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function readCollapsedIds(): Set<string> {
  if (typeof document === "undefined") return new Set();
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_KEY}=`));
  if (!match) return new Set();
  try {
    const value = decodeURIComponent(match.split("=")[1]);
    const ids = JSON.parse(value) as string[];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

function writeCollapsedIds(ids: Set<string>) {
  const value = encodeURIComponent(JSON.stringify([...ids]));
  document.cookie = `${COOKIE_KEY}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

type Props = {
  subjects: SubjectWithUnits[];
  initialCollapsedIds: string[];
};

export default function SubjectList({ subjects, initialCollapsedIds }: Props) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    new Set(initialCollapsedIds)
  );

  const toggleSubject = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      // sync with browser cookie
      // read fresh state from cookie in case of multiple tabs
      const cookieIds = readCollapsedIds();
      if (next.has(id)) {
        cookieIds.add(id);
      } else {
        cookieIds.delete(id);
      }
      writeCollapsedIds(cookieIds);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {subjects.map((subject, subjectIndex) => {
        const colorClass = SUBJECT_COLORS[subjectIndex % SUBJECT_COLORS.length];
        const isOpen = !collapsedIds.has(subject.id);

        return (
          <Collapsible
            key={subject.id}
            open={isOpen}
            onOpenChange={() => toggleSubject(subject.id)}
          >
            <div className="rounded-xl border overflow-hidden shadow-sm">
              {/* Subject color header */}
              <CollapsibleTrigger asChild>
                <button
                  className={`w-full bg-gradient-to-r ${colorClass} px-5 py-4 text-white flex items-center justify-between cursor-pointer`}
                >
                  <h2 className="text-lg font-bold">{subject.name}</h2>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    className={`w-5 h-5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="bg-card divide-y">
                  {subject.units.map((unit) => (
                    <div key={unit.id} className="px-5 py-4">
                      <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                        {unit.name}
                      </h3>
                      <div className="grid gap-2">
                        {unit.lessons.map((lesson, index) => (
                          <Link
                            key={lesson.id}
                            href={`/lessons/${lesson.id}`}
                            className="flex items-center justify-between p-3 rounded-lg border bg-background hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 hover:shadow-sm transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 shrink-0">
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  className="w-3.5 h-3.5 ml-0.5"
                                >
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </span>
                              <div>
                                <span className="text-xs text-muted-foreground mr-2">
                                  #{index + 1}
                                </span>
                                <span className="text-sm font-medium">
                                  {lesson.title}
                                </span>
                              </div>
                            </div>
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              className="w-4 h-4 text-muted-foreground group-hover:text-indigo-500 transition-colors shrink-0"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}
