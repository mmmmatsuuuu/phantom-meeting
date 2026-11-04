"use client";

import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import type { CodeLanguage } from "@/lib/db/code-snippets";

// 色分けは意味の区別に必要な最小限にする。赤は答え合わせと直すところ（エラー）にだけ使うため、ここでは使わない
const highlightStyle = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.definitionKeyword, tags.operatorKeyword], fontWeight: "700", color: "var(--ink)" },
  { tag: [tags.string, tags.special(tags.string)], color: "#6b4e16" },
  { tag: [tags.number, tags.bool, tags.null], color: "#2b5f8a" },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: "var(--pencil)", fontStyle: "italic" },
]);

type Props = {
  language: CodeLanguage;
  initialValue: string;
  onChange: (value: string) => void;
  onRun?: () => void;
};

/**
 * CodeMirror 6 の薄いラッパー。language が変わらない限り
 * 再マウントしない（呼び出し側で snippet 切り替え時に key を変えて再マウントさせる想定）。
 */
export default function CodeEditor({ language, initialValue, onChange, onRun }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);

  // レンダー中の ref 書き込みは React のルール違反のため、コミット後に最新のコールバックへ差し替える
  useEffect(() => {
    onChangeRef.current = onChange;
    onRunRef.current = onRun;
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: initialValue,
      extensions: [
        basicSetup,
        language === "python" ? python() : javascript(),
        // basicSetup の既定の色分けより優先させる
        Prec.high(syntaxHighlighting(highlightStyle)),
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
        // コードはノートではないため方眼にせず、用紙の色だけにする（docs/design.md）
        EditorView.theme({
          "&": { fontSize: "14px", backgroundColor: "var(--sheet)", color: "var(--ink)" },
          ".cm-content": { minHeight: "160px", fontFamily: "var(--font-mono)" },
          ".cm-gutters": { backgroundColor: "var(--sheet)", color: "#a6a398", borderRight: "1px solid var(--rule)" },
          ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "rgb(29 43 63 / 0.04)" },
          "&.cm-focused": { outline: "none" },
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  return (
    <div
      ref={containerRef}
      className="rounded-sm border border-rule-strong overflow-hidden focus-within:border-ink"
    />
  );
}
