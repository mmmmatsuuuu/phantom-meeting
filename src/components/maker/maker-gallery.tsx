"use client";

import { useState } from "react";
import MakerConsole from "@/components/maker/maker-console";
import SubmitButton from "@/components/shared/submit-button";
import type { MakerGalleryItem } from "@/lib/db/maker";

type Props = {
  eventId: string;
  initialItems: MakerGalleryItem[];
  isTeacher: boolean;
};

export default function MakerGallery({ eventId, initialItems, isTeacher }: Props) {
  const [items, setItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const selected = items.find((item) => item.user_id === selectedId) ?? null;

  // コードは作品を開いたときだけ取得する（一覧の取得を軽くするため）
  const openItem = async (userId: string) => {
    setSelectedId(userId);
    setCode(null);
    setLoadError(null);
    setUpdateError(null);
    try {
      const res = await fetch(`/api/maker/events/${eventId}/submissions/${userId}`);
      if (!res.ok) throw new Error();
      const { data } = (await res.json()) as { data: { code: string } };
      setCode(data.code);
    } catch {
      setLoadError("作品を読み込めませんでした");
    }
  };

  const toggleHidden = async (item: MakerGalleryItem) => {
    const hidden = item.hidden_at === null;
    setUpdating(true);
    setUpdateError(null);
    try {
      const res = await fetch(
        `/api/maker/events/${eventId}/submissions/${item.user_id}/visibility`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hidden }),
        }
      );
      if (!res.ok) throw new Error();
      setItems((prev) =>
        prev.map((i) =>
          i.user_id === item.user_id
            ? { ...i, hidden_at: hidden ? new Date().toISOString() : null }
            : i
        )
      );
    } catch {
      setUpdateError("変更に失敗しました。もう一度お試しください");
    } finally {
      setUpdating(false);
    }
  };

  if (items.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">まだ作品がありません</p>;
  }

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6 items-start">
      <div className="grid gap-2">
        {items.map((item) => (
          <button
            key={item.user_id}
            onClick={() => openItem(item.user_id)}
            className={`text-left rounded-lg border p-3 transition-colors hover:border-indigo-400 ${
              item.user_id === selectedId ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40" : "bg-card"
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium truncate">{item.title}</span>
              {item.hidden_at && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 shrink-0">
                  公開停止中
                </span>
              )}
            </span>
            <span className="block text-xs text-muted-foreground mt-1">
              {item.student_number ?? "教員"}
            </span>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="rounded-lg border bg-card p-4 space-y-4 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">{selected.title}</h2>
              <p className="text-xs text-muted-foreground">
                作者: {selected.student_number ?? "教員"}
              </p>
            </div>
            {isTeacher && (
              <SubmitButton
                loading={updating}
                loadingLabel="変更中..."
                onClick={() => toggleHidden(selected)}
                className="px-3 py-1.5 text-xs rounded-md border hover:bg-muted transition-colors disabled:opacity-50"
              >
                {selected.hidden_at ? "公開を再開" : "公開停止"}
              </SubmitButton>
            )}
          </div>
          {updateError && <p className="text-xs text-red-600 dark:text-red-400">{updateError}</p>}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.description}</p>

          {loadError && <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>}
          {code !== null && (
            <>
              <MakerConsole key={selected.user_id} code={code} />
              <details>
                <summary className="cursor-pointer text-sm font-semibold">コードを見る</summary>
                <pre className="mt-2 text-xs font-mono bg-muted/40 rounded p-3 overflow-x-auto">
                  {code}
                </pre>
              </details>
            </>
          )}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">
          作品を選ぶと、説明と実行ボタンが表示されます
        </p>
      )}
    </div>
  );
}
