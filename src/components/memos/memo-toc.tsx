"use client";

import { useEffect, useState } from "react";

type TocLesson = { id: string; title: string };
type TocUnit = { id: string; name: string; lessons: TocLesson[] };
type TocSubject = { id: string; name: string; units: TocUnit[] };

type Props = {
  subjects: TocSubject[];
};

export default function MemoToc({ subjects }: Props) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const sectionIds: string[] = [];
    subjects.forEach((s) => {
      sectionIds.push(`subject-${s.id}`);
      s.units.forEach((u) => {
        sectionIds.push(`unit-${u.id}`);
        u.lessons.forEach((l) => {
          sectionIds.push(`lesson-${l.id}`);
        });
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-10% 0px -85% 0px", threshold: 0 }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [subjects]);

  return (
    <nav aria-label="メモ目次">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        目次
      </p>
      <ul className="space-y-1 text-sm">
        {subjects.map((subject) => (
          <li key={subject.id}>
            <a
              href={`#subject-${subject.id}`}
              className={`block py-1 px-2 font-medium rounded transition-colors ${
                activeId === `subject-${subject.id}`
                  ? "text-indigo-600 bg-indigo-50"
                  : "text-foreground hover:text-indigo-600 hover:bg-muted"
              }`}
            >
              {subject.name}
            </a>
            <ul className="ml-3 space-y-0.5 mt-0.5">
              {subject.units.map((unit) => (
                <li key={unit.id}>
                  <a
                    href={`#unit-${unit.id}`}
                    className={`block py-0.5 px-2 rounded transition-colors ${
                      activeId === `unit-${unit.id}`
                        ? "text-indigo-600 bg-indigo-50"
                        : "text-muted-foreground hover:text-indigo-600 hover:bg-muted"
                    }`}
                  >
                    {unit.name}
                  </a>
                  <ul className="ml-3 space-y-0.5 mt-0.5">
                    {unit.lessons.map((lesson) => (
                      <li key={lesson.id}>
                        <a
                          href={`#lesson-${lesson.id}`}
                          className={`block py-0.5 px-2 rounded transition-colors text-xs ${
                            activeId === `lesson-${lesson.id}`
                              ? "text-indigo-600 bg-indigo-50"
                              : "text-muted-foreground hover:text-indigo-600 hover:bg-muted"
                          }`}
                        >
                          {lesson.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
