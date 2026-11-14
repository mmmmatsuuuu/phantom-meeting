"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { extractYouTubeVideoId } from "@/lib/utils";
import SubmitButton from "@/components/shared/submit-button";

type Props = {
  lessonId: string;
  initialTitle: string;
  initialYoutubeUrl: string;
  /** 保存後・キャンセル時に戻る先（そのレッスンの科目のコンテンツ管理ページ） */
  returnHref: string;
};

/** レッスンのタイトルと YouTube URL を編集する。プレイグラウンドの切り替えはコード管理画面で行う */
export default function LessonEditForm({
  lessonId,
  initialTitle,
  initialYoutubeUrl,
  returnHref,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [youtubeUrl, setYoutubeUrl] = useState(initialYoutubeUrl);
  const [saving, setSaving] = useState(false);

  const videoId = extractYouTubeVideoId(youtubeUrl);

  const handleSave = async () => {
    if (!title.trim() || !youtubeUrl.trim()) {
      toast.error("タイトルと YouTube URL は必須です");
      return;
    }
    if (!videoId) {
      toast.error("有効な YouTube URL を入力してください");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/contents/lessons/${lessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), youtubeUrl: youtubeUrl.trim() }),
      });
      if (res.ok) {
        toast.success("レッスンを更新しました");
        router.push(returnHref);
      } else {
        toast.error("更新に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-md border bg-card space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">タイトル</label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">YouTube URL</label>
          <input
            type="url"
            className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
          />
          {videoId ? (
            <div className="w-full aspect-video rounded-md overflow-hidden bg-black mt-2">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="プレビュー"
              />
            </div>
          ) : (
            <p className="text-xs text-destructive">有効な YouTube URL を入力してください</p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <SubmitButton
          loading={saving}
          loadingLabel="保存中..."
          onClick={handleSave}
          className="flex-1 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          保存する
        </SubmitButton>
        <Link
          href={returnHref}
          className="px-5 py-2.5 rounded-md border text-sm hover:bg-muted transition-colors"
        >
          キャンセル
        </Link>
      </div>
    </div>
  );
}
