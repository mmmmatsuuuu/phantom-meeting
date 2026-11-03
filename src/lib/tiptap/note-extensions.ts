import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { createLowlight } from "lowlight";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import c from "highlight.js/lib/languages/c";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import { ResizableImage } from "@/lib/tiptap/resizable-image-extension";

const lowlight = createLowlight();
lowlight.register("javascript", javascript);
lowlight.register("python", python);
lowlight.register("c", c);
lowlight.register("xml", xml);
lowlight.register("css", css);

/**
 * ノートとノートのひな形のエディタで使う拡張機能。
 * ひな形をそのままノートに読み込むため、両方で同じものを使う
 */
export function createNoteExtensions(placeholder: string) {
  return [
    StarterKit.configure({ codeBlock: false }),
    Link.configure({ openOnClick: false }),
    CodeBlockLowlight.configure({ lowlight }),
    Placeholder.configure({ placeholder }),
    Table.configure({ resizable: false }),
    TableRow,
    TableCell,
    TableHeader,
    ResizableImage,
  ];
}
