"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import { createLowlight } from "lowlight";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import c from "highlight.js/lib/languages/c";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import MemoToolbar from "@/components/lesson/memo-toolbar";

const lowlight = createLowlight();
lowlight.register("javascript", javascript);
lowlight.register("python", python);
lowlight.register("c", c);
lowlight.register("xml", xml);
lowlight.register("css", css);

type Props = {
  uid: string;
  initialContent: Record<string, unknown>;
  onChange: (uid: string, content: Record<string, unknown>) => void;
  placeholder?: string;
};

type UploadResponse = { data: { url: string } | null; error: string | null };

export default function QuizQuestionEditor({ uid, initialContent, onChange, placeholder }: Props) {
  const [codeBlockLang, setCodeBlockLang] = useState("");
  const [isCodeBlockActive, setIsCodeBlockActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const syncState = (
    editor: Parameters<
      NonNullable<Parameters<typeof useEditor>[0]["onUpdate"]>
    >[0]["editor"]
  ) => {
    const active = editor.isActive("codeBlock");
    setIsCodeBlockActive(active);
    setCodeBlockLang(active ? (editor.getAttributes("codeBlock").language ?? "") : "");
  };

  const editor = useEditor({
    immediatelyRender: false,
    content: initialContent,
    onUpdate: ({ editor: e }) => {
      syncState(e);
      onChange(uid, e.getJSON() as Record<string, unknown>);
    },
    onSelectionUpdate: ({ editor: e }) => {
      syncState(e);
    },
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Link.configure({ openOnClick: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder: placeholder ?? "問題文を入力..." }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Image,
    ],
    editorProps: {
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

        fetch("/api/images/upload", { method: "POST", body: formData })
          .then((res) => res.json() as Promise<UploadResponse>)
          .then((json) => {
            if (json.data?.url) {
              const { state } = view;
              const imageType = state.schema.nodes["image"];
              if (imageType) {
                const node = imageType.create({ src: json.data.url });
                view.dispatch(state.tr.replaceSelectionWith(node));
              }
            }
          })
          .finally(() => {
            setIsUploading(false);
          });

        return true;
      },
    },
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
