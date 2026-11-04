"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { createNoteExtensions } from "@/lib/tiptap/note-extensions";

// useEditor は拡張と editorProps を参照で比べるため、描画のたびに作り直さない
const extensions = createNoteExtensions({ openLinksOnClick: true });
const editorProps = { attributes: { class: "rich-content" } };

type Props = {
  content: Record<string, unknown>;
};

export default function RichContent({ content }: Props) {
  const editor = useEditor({
    editable: false,
    immediatelyRender: false,
    content,
    extensions,
    editorProps,
  });

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
