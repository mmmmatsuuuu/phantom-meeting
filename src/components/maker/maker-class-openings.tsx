"use client";

import { useState } from "react";
import SubmitButton from "@/components/shared/submit-button";
import type { MakerClass } from "@/lib/maker-settings";

type Props = {
  eventId: string;
  classes: (MakerClass & { submittedCount: number })[];
  initialOpenKeys: string[];
};

function classKey(grade: number, classNum: number): string {
  return `${grade}-${classNum}`;
}

export default function MakerClassOpenings({ eventId, classes, initialOpenKeys }: Props) {
  const [openKeys, setOpenKeys] = useState(new Set(initialOpenKeys));
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (grade: number, classNum: number) => {
    const key = classKey(grade, classNum);
    const open = !openKeys.has(key);
    setSavingKey(key);
    setError(null);
    try {
      const res = await fetch(`/api/maker/events/${eventId}/gallery-openings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, classNum, open }),
      });
      if (!res.ok) throw new Error();
      setOpenKeys((prev) => {
        const next = new Set(prev);
        if (open) next.add(key);
        else next.delete(key);
        return next;
      });
    } catch {
      setError("変更に失敗しました。もう一度お試しください");
    } finally {
      setSavingKey(null);
    }
  };

  if (classes.length === 0) {
    return <p className="text-sm text-muted-foreground">学籍番号が登録された生徒がいません</p>;
  }

  return (
    <div className="space-y-2">
      <div className="grid sm:grid-cols-2 gap-2">
        {classes.map(({ grade, classNum, submittedCount }) => {
          const key = classKey(grade, classNum);
          const isOpen = openKeys.has(key);
          return (
            <div key={key} className="flex items-center justify-between gap-2 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">
                  {grade}年{classNum}組
                  <span
                    className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      isOpen
                        ? "bg-surface text-ink"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isOpen ? "閲覧できる" : "閲覧できない"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">提出 {submittedCount} 件</p>
              </div>
              <SubmitButton
                loading={savingKey === key}
                loadingLabel="変更中..."
                onClick={() => toggle(grade, classNum)}
                className="px-3 py-1.5 text-xs rounded-md border hover:bg-muted transition-colors disabled:opacity-50 shrink-0"
              >
                {isOpen ? "閉じる" : "開放する"}
              </SubmitButton>
            </div>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-pen">{error}</p>}
    </div>
  );
}
