"use client";

import { useMemo, useState } from "react";
import { useEditor, EditorContent, type EditorOptions } from "@tiptap/react";
import MemoToolbar from "@/components/lesson/memo-toolbar";
import { createNoteExtensions } from "@/lib/tiptap/note-extensions";
import { useCodeBlockState } from "@/lib/hooks/use-code-block-state";

type Props = {
  uid: string;
  initialContent: Record<string, unknown>;
  onChange: (uid: string, content: Record<string, unknown>) => void;
  placeholder?: string;
};

type UploadResponse = { data: { url: string; fileId: string } | null; error: string | null };

function collectImageFileIds(doc: { descendants: (fn: (node: { type: { name: string }; attrs: Record<string, unknown> }) => void) => void }): Set<string> {
  const ids = new Set<string>();
  doc.descendants((node) => {
    if (node.type.name === "image" && typeof node.attrs.fileId === "string") {
      ids.add(node.attrs.fileId);
    }
  });
  return ids;
}

export default function QuizQuestionEditor({ uid, initialContent, onChange, placeholder }: Props) {
  const { codeBlockLang, isCodeBlockActive, sync: syncCodeBlock } = useCodeBlockState();
  const [isUploading, setIsUploading] = useState(false);

  // useEditor は拡張と editorProps を参照で比べるため、描画のたびに作り直さない
  const extensions = useMemo(
    () => createNoteExtensions({ placeholder: placeholder ?? "問題文を入力..." }),
    [placeholder]
  );
  const editorProps = useMemo<EditorOptions["editorProps"]>(
    () => ({
      attributes: {
        class: "min-h-[80px] p-3 text-sm focus:outline-none",
      },
      handlePaste(view, event) {
        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find((item) => item.type.startsWith("image/"));
        if (!imageItem) return false;

        const file = imageItem.getAsFile();
        if (!file) return false;

        setIsUploading(true);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("purpose", "quiz");

        fetch("/api/images/upload", { method: "POST", body: formData })
          .then((res) => res.json() as Promise<UploadResponse>)
          .then((json) => {
            if (json.data?.url) {
              const { state } = view;
              const imageType = state.schema.nodes["image"];
              if (imageType) {
                const node = imageType.create({
                  src: json.data.url,
                  fileId: json.data.fileId ?? null,
                });
                view.dispatch(state.tr.replaceSelectionWith(node));
              }
            }
          })
          .finally(() => {
            setIsUploading(false);
          });

        return true;
      },
    }),
    []
  );

  const editor = useEditor({
    immediatelyRender: false,
    content: initialContent,
    // ボタン操作でコードブロックにしたときもカーソルは動かないため、エディタのすべての変化で判定し直す
    onTransaction: ({ editor: e }) => syncCodeBlock(e),
    onUpdate: ({ editor: e, transaction }) => {
      onChange(uid, e.getJSON() as Record<string, unknown>);

      // エディタから削除された画像を ImageKit からも削除
      const prevIds = collectImageFileIds(transaction.before);
      const currIds = collectImageFileIds(transaction.doc);
      prevIds.forEach((fileId) => {
        if (!currIds.has(fileId)) {
          fetch(`/api/images/${fileId}`, { method: "DELETE" }).catch(() => {});
        }
      });
    },
    extensions,
    editorProps,
  });

  if (!editor) return null;

  return (
    <div className="rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring">
      <MemoToolbar
        editor={editor}
        codeBlockLang={codeBlockLang}
        isCodeBlockActive={isCodeBlockActive}
      />
      <EditorContent editor={editor} />
      {isUploading && (
        <p className="px-3 py-1 text-xs text-muted-foreground border-t">
          画像をアップロード中...
        </p>
      )}
    </div>
  );
}
