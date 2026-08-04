"use client";

import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { useTheme } from "next-themes";
import type { CodeLanguage } from "@/lib/db/code-snippets";

type Props = {
  language: CodeLanguage;
  initialValue: string;
  onChange: (value: string) => void;
  onRun?: () => void;
};

/**
 * CodeMirror 6 の薄いラッパー。language・resolvedTheme が変わらない限り
 * 再マウントしない（呼び出し側で snippet 切り替え時に key を変えて再マウントさせる想定）。
 */
export default function CodeEditor({ language, initialValue, onChange, onRun }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: initialValue,
      extensions: [
        basicSetup,
        language === "python" ? python() : javascript(),
        ...(resolvedTheme === "dark" ? [oneDark] : []),
        // Mod-Enter は CodeMirror の慣例でMacはCmd、Windows/LinuxはCtrlに自動対応する。
        // basicSetup の defaultKeymap が Mod-Enter を「空行を挿入」に割り当て済みのため、
        // Prec.highest でそれより優先させないと実行側のハンドラが呼ばれない。
        // indentWithTab はアクセシビリティ上の理由でbasicSetupには含まれない
        // （Tabキーがフォーカス移動に使われてしまうため）ため明示的に追加する。
        Prec.highest(
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => {
                onRunRef.current?.();
                return true;
              },
            },
            indentWithTab,
          ])
        ),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.theme({ "&": { fontSize: "13px" }, ".cm-content": { minHeight: "160px" } }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, resolvedTheme]);

  return <div ref={containerRef} className="rounded-md border overflow-hidden" />;
}
