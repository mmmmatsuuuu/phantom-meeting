"use client";

import { useState } from "react";
import MakerConsole from "@/components/maker/maker-console";
import SubmitButton from "@/components/shared/submit-button";
import Mascot from "@/components/shared/mascot";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MakerGalleryItem } from "@/lib/db/maker";

type Props = {
  eventId: string;
  initialItems: MakerGalleryItem[];
  isTeacher: boolean;
};

// 用紙の傾き（度）。並べたときに貼り出した感じが出るよう、少しずつ変える
const TILTS = [-1.2, 0.8, -0.4, 1.1, -0.9, 0.5];

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
    return (
      <div className="flex items-center gap-4 py-6 border-b border-rule">
        <Mascot pose="rest" size={96} />
        <p className="text-sm text-muted-foreground">このクラスの作品はまだありません。のんびり待ちましょう。</p>
      </div>
    );
  }

  return (
    <div>
      {/* 作品展：掲示板にピンで留めた用紙を、少しずつ傾けて並べる */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-x-[22px] gap-y-7 px-1 pt-3">
        {items.map((item, index) => (
          <button
            key={item.user_id}
            onClick={() => openItem(item.user_id)}
            style={{ rotate: `${TILTS[index % TILTS.length]}deg` }}
            className={`group relative text-left px-4 pt-[22px] pb-3.5 bg-sheet border border-rule-strong before:absolute before:-top-[7px] before:left-1/2 before:-ml-[7px] before:size-3.5 before:rounded-full before:bg-ink ${
              item.user_id === selectedId ? "outline-2 outline-offset-[3px] outline-ink" : ""
            }`}
          >
            <span className="block font-hand font-semibold text-[17px] leading-relaxed group-hover:underline underline-offset-4">
              {item.title}
            </span>
            <span className="block mt-1 mb-2 font-hand text-[13px] leading-[1.8] text-muted-foreground line-clamp-2">
              {item.description}
            </span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {item.student_number ?? "教員"}
              {item.hidden_at && <span className="font-semibold text-red-pen">公開停止中</span>}
            </span>
          </button>
        ))}
      </div>

      {/* 作品を開くとモーダルで表示する（一覧の下に出すと、作品が多いときにスクロールが大変なため） */}
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-sheet">
          {selected && (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-7">
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2 pr-6">
                  <div>
                    <DialogTitle className="font-hand font-semibold text-[22px]">{selected.title}</DialogTitle>
                    <p className="text-xs text-muted-foreground">
                      {selected.student_number ?? "教員"}
                      {selected.hidden_at && <span className="ml-2 font-semibold text-red-pen">公開停止中</span>}
                    </p>
                  </div>
                  {isTeacher && (
                    <SubmitButton
                      loading={updating}
                      loadingLabel="変更中..."
                      onClick={() => toggleHidden(selected)}
                      className="px-3 py-1.5 text-xs rounded-sm border border-ink hover:bg-surface transition-colors disabled:opacity-50"
                    >
                      {selected.hidden_at ? "公開を再開" : "公開停止"}
                    </SubmitButton>
                  )}
                </div>
                {updateError && <p className="mt-2 text-xs text-red-pen">{updateError}</p>}
                <DialogDescription className="mt-2 font-hand text-base leading-loose text-foreground whitespace-pre-wrap">
                  {selected.description}
                </DialogDescription>
                {code !== null && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-muted-foreground">コードを見る</summary>
                    <pre className="mt-2 px-3.5 py-2.5 font-mono text-xs leading-5 bg-paper border border-rule max-h-60 overflow-auto">
                      {code}
                    </pre>
                  </details>
                )}
              </div>
              <div className="min-w-0">
                {loadError && <p className="text-sm text-red-pen">{loadError}</p>}
                {code === null && !loadError && <p className="text-sm text-muted-foreground">読み込み中...</p>}
                {code !== null && <MakerConsole key={selected.user_id} code={code} />}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
