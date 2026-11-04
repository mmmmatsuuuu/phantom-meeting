import { useCallback, useState } from "react";
import type { Editor } from "@tiptap/react";

/**
 * カーソル位置がコードブロックか、その言語は何かを追う（ツールバーの言語の欄と、選択中のボタンの表示に使う）。
 * ボタン操作でコードブロックにしたときはカーソルが動かないため、選択の変化ではなく
 * エディタのすべての変化（onTransaction）で sync を呼ぶ
 */
export function useCodeBlockState() {
  const [state, setState] = useState({ isCodeBlockActive: false, codeBlockLang: "" });

  const sync = useCallback((editor: Editor) => {
    const isCodeBlockActive = editor.isActive("codeBlock");
    const codeBlockLang = isCodeBlockActive ? (editor.getAttributes("codeBlock").language ?? "") : "";
    // 変わっていなければ再描画しない（打鍵のたびに呼ばれるため）
    setState((prev) =>
      prev.isCodeBlockActive === isCodeBlockActive && prev.codeBlockLang === codeBlockLang
        ? prev
        : { isCodeBlockActive, codeBlockLang }
    );
  }, []);

  return { ...state, sync };
}
