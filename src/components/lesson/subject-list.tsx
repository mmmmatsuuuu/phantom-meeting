"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { SubjectWithUnits } from "@/lib/db/contents";
import type { LessonBadge } from "@/lib/student-dashboard";
import { sortUnitsNewestFirst } from "@/lib/contents-order";
import ReviewPromptDialog from "@/components/student/review-prompt-dialog";

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
  /** 生徒の学習状況（レッスンID → ノートの有無と小テストの得点）。未指定なら非表示 */
  lessonBadges?: Record<string, LessonBadge>;
  /** 単元内に表示する自由制作の課題（単元ID → 課題） */
  makerEventsByUnit?: Record<string, { id: string; title: string }[]>;
};

// 行の高さはルーズリーフの罫線の間隔（40px）にそろえる
const ROW = "grid grid-cols-[44px_minmax(0,1fr)_auto] gap-2 h-10 leading-10";

function LessonMarks({ badge }: { badge: LessonBadge }) {
  return (
    <span className="text-xs leading-10 text-muted-foreground whitespace-nowrap">
      {badge.memoCount > 0 && <span className="font-semibold text-ink">ノートあり</span>}
      {badge.hasQuiz &&
        (badge.attempted ? (
          // 小テストの得点は答え合わせなので赤ペン
          <span className="ml-2.5 font-semibold text-red-pen">
            {badge.latestRate !== null ? badge.latestRate : "済"}
          </span>
        ) : (
          <span className="ml-2.5">未受験</span>
        ))}
    </span>
  );
}

export default function SubjectList({
  subjects,
  initialCollapsedIds,
  lessonBadges,
  makerEventsByUnit,
}: Props) {
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
    <div>
      {subjects.map((subject) => {
        const isOpen = !collapsedIds.has(subject.id);

        return (
          <Collapsible
            key={subject.id}
            open={isOpen}
            onOpenChange={() => toggleSubject(subject.id)}
            className="mt-7"
          >
            <CollapsibleTrigger className="flex items-center gap-1.5 text-[13px] tracking-[0.1em] text-muted-foreground hover:text-foreground transition-colors">
              {subject.name}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className={`w-3.5 h-3.5 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </CollapsibleTrigger>

            <CollapsibleContent>
              {/* 新しい単元を上に表示する。単元内のレッスンは授業の順のまま */}
              {sortUnitsNewestFirst(subject.units).map((unit) => (
                <section
                  key={unit.id}
                  className="loose-leaf mt-3 [&+&]:mt-6 pl-16 pr-7 pb-10 border border-rule-strong"
                >
                  <div className="flex items-end justify-between gap-3 h-20 pb-2">
                    <h2 className="font-hand font-semibold text-[22px] leading-normal">{unit.name}</h2>
                    {unit.lessons.length > 0 && (
                      <ReviewPromptDialog unitId={unit.id} unitName={unit.name} />
                    )}
                  </div>
                  {unit.lessons.map((lesson, index) => (
                    <Link key={lesson.id} href={`/lessons/${lesson.id}`} className={`group ${ROW}`}>
                      <span className="font-mono text-[13px] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="font-hand text-[17px] truncate group-hover:underline underline-offset-[5px]">
                        {lesson.title}
                      </span>
                      {lessonBadges?.[lesson.id] ? (
                        <LessonMarks badge={lessonBadges[lesson.id]} />
                      ) : (
                        <span />
                      )}
                    </Link>
                  ))}
                  {makerEventsByUnit?.[unit.id]?.map((event) => (
                    <Link key={event.id} href={`/maker/${event.id}`} className={`group ${ROW}`}>
                      <span className="text-[13px] text-muted-foreground">自由</span>
                      <span className="font-hand font-semibold text-[17px] truncate group-hover:underline underline-offset-[5px]">
                        {event.title}
                      </span>
                      <span />
                    </Link>
                  ))}
                </section>
              ))}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
