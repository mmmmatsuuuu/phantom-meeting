"use client";

import { useState, useEffect } from "react";
import { useEditor, EditorContent, generateHTML } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { toast } from "sonner";
import type { Memo } from "@/lib/db/memos";
import MemoToolbar from "@/components/lesson/memo-toolbar";

type Props = {
  lessonId: string;
  getCurrentTime: () => number | null;
  seekTo: (seconds: number) => void;
  onClose?: () => void;
};

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MemoSection({ lessonId, getCurrentTime, seekTo, onClose }: Props) {
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [editorEmpty, setEditorEmpty] = useState(true);

  const editor = useEditor({
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setEditorEmpty(editor.isEmpty);
    },
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "動画を見て気づいたことや疑問をメモしよう..." }),
    ],
    editorProps: {
      attributes: {
        class: "min-h-[120px] p-3 text-sm focus:outline-none",
      },
    },
  });

  useEffect(() => {
    fetch(`/api/memos?lessonId=${lessonId}`)
      .then((res) => res.json())
      .then((json: { data: Memo[] | null }) => {
        if (json.data) setMemos(json.data);
      })
      .catch(() => {});
  }, [lessonId]);

  const handleTimestamp = () => {
    const t = getCurrentTime();
    if (t !== null) setTimestamp(t);
  };

  const handleSave = async () => {
    if (!editor || editor.isEmpty) return;
    setSaveState("saving");
    const content = editor.getJSON();
    const res = await fetch("/api/memos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, content, timestampSeconds: timestamp }),
    });
    const json = (await res.json()) as { data: Memo | null; error: string | null };
    if (json.data) {
      setMemos((prev) => [json.data!, ...prev]);
      editor.commands.clearContent();
      setTimestamp(null);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } else {
      setSaveState("idle");
    }
  };

  const handleDelete = async (memoId: string) => {
    const res = await fetch(`/api/memos/${memoId}`, { method: "DELETE" });
    if (res.ok) {
      setMemos((prev) => prev.filter((m) => m.id !== memoId));
    }
  };

  const handlePost = async (memo: Memo) => {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memoId: memo.id, lessonId, content: memo.content }),
    });
    if (res.status === 409) {
      toast.warning("このメモはすでに投稿済みです");
      return;
    }
    if (res.ok) {
      toast.success("クラスに投稿しました");
    } else {
      toast.error("投稿に失敗しました");
    }
  };

  return (
    <div className="sticky top-20 rounded-md border bg-card p-4 space-y-3 max-h-[calc(100vh-6rem)] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">✏️ メモ</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="メモを閉じる"
          >
            ✕
          </button>
        )}
      </div>

      {/* タイムスタンプ記録 */}
      <button
        onClick={handleTimestamp}
        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors w-full justify-center"
      >
        ⏱️ タイムスタンプを記録
      </button>

      {timestamp !== null && (
        <p className="text-xs text-muted-foreground">
          📍 {formatTimestamp(timestamp)} からのメモ
        </p>
      )}

      {/* tiptap エディタ */}
      <div className="rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring">
        {editor && <MemoToolbar editor={editor} />}
        <EditorContent editor={editor} />
      </div>

      <button
        onClick={handleSave}
        disabled={saveState === "saving" || !editor || editorEmpty}
        className="w-full py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saveState === "saved"
          ? "✅ 保存しました！"
          : saveState === "saving"
          ? "保存中..."
          : "保存する"}
      </button>

      {/* 過去のメモ タイムライン */}
      {memos.length > 0 && (
        <div className="pt-1 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            過去のメモ
          </p>
          <div className="space-y-2">
            {memos.map((m) => (
              <div key={m.id} className="p-3 rounded-md border bg-background space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {m.timestamp_seconds !== null ? (
                      <button
                        onClick={() => seekTo(m.timestamp_seconds!)}
                        className="text-primary hover:underline"
                      >
                        📍 {formatTimestamp(m.timestamp_seconds)}
                      </button>
                    ) : null}
                    {m.timestamp_seconds !== null ? " ・ " : ""}
                    {formatDate(m.created_at)}
                  </p>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    aria-label="メモを削除"
                  >
                    🗑️
                  </button>
                </div>
                <div
                  className="text-sm leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: generateHTML(m.content, [StarterKit, Link]),
                  }}
                />
                <button
                  onClick={() => handlePost(m)}
                  className="text-xs px-2 py-1 rounded-md border hover:bg-muted transition-colors"
                >
                  クラスに投稿
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
