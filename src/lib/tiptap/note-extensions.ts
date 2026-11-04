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
 * ノート・ノートのひな形・小テストのエディタと、その表示（RichContent）で使う拡張機能。
 * ひな形をそのままノートに読み込み、書いたものを同じ見た目で表示するため、すべてで同じものを使う。
 * useEditor は拡張を参照で比べるため、呼び出し側は描画のたびに作り直さないこと（useMemo かモジュールの定数にする）
 */
export function createNoteExtensions({
  placeholder,
  openLinksOnClick = false,
}: {
  /** 空のときに出す案内。表示専用なら省略する */
  placeholder?: string;
  /** リンクをクリックで開くか。編集中は誤って開かないよう false、表示専用では true */
  openLinksOnClick?: boolean;
} = {}) {
  return [
    StarterKit.configure({ codeBlock: false }),
    Link.configure({ openOnClick: openLinksOnClick }),
    CodeBlockLowlight.configure({ lowlight }),
    ...(placeholder !== undefined ? [Placeholder.configure({ placeholder })] : []),
    Table.configure({ resizable: false }),
    TableRow,
    TableCell,
    TableHeader,
    ResizableImage,
  ];
}
