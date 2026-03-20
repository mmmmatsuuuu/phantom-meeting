"use client";

import { Button } from "@/components/ui/button";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import type { TiptapContent } from "@/lib/db/memos";

function contentToMarkdown(content: TiptapContent): string {
  const editor = new Editor({
    extensions: [StarterKit, Markdown],
    content,
  });
  const storage = editor.storage as unknown as { markdown: { getMarkdown: () => string } };
  const md = storage.markdown.getMarkdown();
  editor.destroy();
  return md;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type MemoData = {
  id: string;
  content: TiptapContent;
  timestamp_seconds: number | null;
};

export type MemoSection = {
  lessonTitle: string;
  youtubeUrl: string | null;
  memos: MemoData[];
};

type Props = {
  filename: string;
  sections: MemoSection[];
};

export default function MemoDownloadButton({ filename, sections }: Props) {
  const totalMemos = sections.reduce((sum, s) => sum + s.memos.length, 0);
  if (totalMemos === 0) return null;

  const handleDownload = () => {
    const parts: string[] = [];
    for (const section of sections) {
      parts.push(`## ${section.lessonTitle}\n`);
      if (section.youtubeUrl) {
        parts.push(`[動画](${section.youtubeUrl})\n`);
      }
      for (const memo of section.memos) {
        if (memo.timestamp_seconds !== null) {
          parts.push(`> ⏱ ${formatTime(memo.timestamp_seconds)}\n`);
        }
        parts.push(contentToMarkdown(memo.content));
        parts.push("\n---\n");
      }
    }
    const blob = new Blob([parts.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      ダウンロード
    </Button>
  );
}
