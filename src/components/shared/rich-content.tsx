"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import c from "highlight.js/lib/languages/c";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";

const lowlight = createLowlight();
lowlight.register("javascript", javascript);
lowlight.register("python", python);
lowlight.register("c", c);
lowlight.register("xml", xml);
lowlight.register("css", css);

type Props = {
  content: Record<string, unknown>;
};

export default function RichContent({ content }: Props) {
  const editor = useEditor({
    editable: false,
    immediatelyRender: false,
    content,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Link.configure({ openOnClick: true }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    editorProps: {
      attributes: {
        class: "rich-content",
      },
    },
  });

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
