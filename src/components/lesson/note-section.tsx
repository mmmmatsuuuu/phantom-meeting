"use client";

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";
import { useEditor, EditorContent, type EditorOptions, type JSONContent } from "@tiptap/react";
import type { Memo } from "@/lib/db/memos";
import type { TiptapDoc } from "@/lib/tiptap-utils";
import { createNoteExtensions } from "@/lib/tiptap/note-extensions";
import { useCodeBlockState } from "@/lib/hooks/use-code-block-state";
import MemoToolbar from "@/components/lesson/memo-toolbar";
import SubmitButton from "@/components/shared/submit-button";
import Mascot from "@/components/shared/mascot";

type Props = {
  lessonId: string;
  /** 先生が用意したノートのひな形。なければ null */
  template: TiptapDoc | null;
  ref?: Ref<NoteSectionHandle>;
};

export type NoteSectionHandle = {
  /** 開いているノートの末尾に内容を追記する（プレイグラウンドの「ノートに貼る」） */
  append: (content: Record<string, unknown>) => void;
};

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

// useEditor は editorProps も参照で比べるため、モジュールの定数にする
const EDITOR_PROPS: EditorOptions["editorProps"] = {
  attributes: { class: "note-content min-h-[416px] px-4 py-4 focus:outline-none" },
  // 生徒は画像を入れられない（使えるのは、ひな形に先生が入れた画像だけ）
  handlePaste(_, event) {
    const items = Array.from(event.clipboardData?.items ?? []);
    return items.some((item) => item.type.startsWith("image/"));
  },
  handleDrop(_, event) {
    const files = Array.from((event as DragEvent).dataTransfer?.files ?? []);
    return files.some((file) => file.type.startsWith("image/"));
  },
};

// 開いているノート。"new" はまだ保存していない新しいノート
type Active = { kind: "none" } | { kind: "new" } | { kind: "memo"; id: string };

/**
 * レッスンのノート。画面上は「ノート」、DB とコードでは memo（docs/design.md の「用語」）。
 * 1 レッスンに 1 つを基本に、ひな形を読み込んで書き進める。保存しても入力欄は空にせず、続きを書ける
 */
export default function NoteSection({ lessonId, template, ref }: Props) {
  const [memos, setMemos] = useState<Memo[] | null>(null);
  const [active, setActive] = useState<Active>({ kind: "none" });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const { codeBlockLang, isCodeBlockActive, sync: syncCodeBlock } = useCodeBlockState();
  // 最後に保存した（または開いた）時点の内容。今の内容と比べて未保存の変更を判定する
  const savedRef = useRef(JSON.stringify(EMPTY_DOC));

  // useEditor は拡張を参照で比べるため、描画のたびに作り直さない
  const extensions = useMemo(
    () =>
      createNoteExtensions({
        placeholder: template
          ? "穴を埋めたり、自由に書き換えたりしよう"
          : "動画を見て分かったことや、考えたことを書こう",
      }),
    [template]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    onUpdate: ({ editor }) => {
      setDirty(JSON.stringify(editor.getJSON()) !== savedRef.current);
    },
    onTransaction: ({ editor }) => syncCodeBlock(editor),
    editorProps: EDITOR_PROPS,
  });

  const open = useCallback(
    (next: Active, content: JSONContent) => {
      if (!editor) return;
      editor.commands.setContent(content, { emitUpdate: false });
      savedRef.current = JSON.stringify(editor.getJSON());
      setDirty(false);
      setMessage(null);
      setActive(next);
    },
    [editor]
  );

  // 自分のノートを読み込み、最後に更新したノートを開く。まだなければ、ひな形の有無で始め方を変える
  useEffect(() => {
    if (!editor) return;
    fetch(`/api/memos?lessonId=${lessonId}`)
      .then((res) => res.json())
      .then((json: { data: Memo[] | null }) => {
        const list = json.data ?? [];
        setMemos(list);
        const latest = [...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
        if (latest) open({ kind: "memo", id: latest.id }, latest.content as JSONContent);
        else if (!template) open({ kind: "new" }, EMPTY_DOC);
      })
      .catch(() => setMemos([]));
  }, [editor, lessonId, template, open]);

  // プレイグラウンドの「ノートに貼る」：開いているノートの末尾に追記する。
  // ノートを開いていなければ、新しいノートを始めてから追記する
  useImperativeHandle(ref, () => ({
    append: (content: Record<string, unknown>) => {
      if (!editor) return;
      if (active.kind === "none") open({ kind: "new" }, EMPTY_DOC);
      editor
        .chain()
        .focus("end")
        .insertContent((content as JSONContent).content ?? [])
        .run();
    },
  }));

  // 保存していない変更がある状態でページを離れようとしたら、ブラウザの確認を出す
  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const confirmDiscard = () =>
    !dirty || window.confirm("保存していない変更があります。破棄してよいですか？");

  const handleSave = async () => {
    if (!editor || active.kind === "none") return;
    setSaving(true);
    setMessage(null);
    const content = editor.getJSON();
    try {
      const res =
        active.kind === "memo"
          ? await fetch(`/api/memos/${active.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content }),
            })
          : await fetch("/api/memos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lessonId, content }),
            });
      const json = (await res.json()) as { data: Memo | null; error: string | null };
      if (!res.ok || !json.data) {
        setMessage({ text: json.error ?? "保存できませんでした。もう一度お試しください", isError: true });
        return;
      }
      const saved = json.data;
      setMemos((prev) => [saved, ...(prev ?? []).filter((m) => m.id !== saved.id)]);
      setActive({ kind: "memo", id: saved.id });
      savedRef.current = JSON.stringify(content);
      setDirty(false);
      setMessage({ text: "保存しました。あとから続きを書けます", isError: false });
    } catch {
      setMessage({ text: "保存できませんでした。もう一度お試しください", isError: true });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (active.kind !== "memo") return;
    if (!window.confirm("このノートを削除しますか？ 元に戻せません。")) return;
    const res = await fetch(`/api/memos/${active.id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage({ text: "削除できませんでした", isError: true });
      return;
    }
    const rest = (memos ?? []).filter((m) => m.id !== active.id);
    setMemos(rest);
    if (rest[0]) open({ kind: "memo", id: rest[0].id }, rest[0].content as JSONContent);
    else if (template) setActive({ kind: "none" });
    else open({ kind: "new" }, EMPTY_DOC);
  };

  // 作った順に番号を振る（ノート1、ノート2…）
  const ordered = [...(memos ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div className="space-y-3">
      {ordered.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
          {ordered.map((memo, index) => (
            <button
              key={memo.id}
              onClick={() =>
                active.kind === "memo" && active.id === memo.id
                  ? undefined
                  : confirmDiscard() && open({ kind: "memo", id: memo.id }, memo.content as JSONContent)
              }
              className={`pb-0.5 border-b-2 transition-colors ${
                active.kind === "memo" && active.id === memo.id
                  ? "border-ink text-ink font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              ノート{index + 1}
            </button>
          ))}
          {active.kind === "new" && (
            <span className="pb-0.5 border-b-2 border-ink font-semibold">新しいノート</span>
          )}
          {active.kind !== "new" && (
            <button
              onClick={() => confirmDiscard() && (template ? setActive({ kind: "none" }) : open({ kind: "new" }, EMPTY_DOC))}
              className="pb-0.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              ＋ 新しいノート
            </button>
          )}
        </div>
      )}

      {memos === null ? (
        <p className="py-8 text-sm text-muted-foreground">読み込み中...</p>
      ) : active.kind === "none" ? (
        <div className="flex items-center gap-4 py-4 border-b border-rule">
          <Mascot pose="offer" size={120} />
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              先生が用意したノートのひな形があります。読み込むと、穴を埋めたり、自由に書き換えたりできます。
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => template && open({ kind: "new" }, template as JSONContent)}
                className="px-4 py-2 text-sm rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                ひな形を読み込む
              </button>
              <button
                onClick={() => open({ kind: "new" }, EMPTY_DOC)}
                className="px-4 py-2 text-sm rounded-sm border border-ink hover:bg-surface transition-colors"
              >
                白紙から書く
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={active.kind === "none" || memos === null ? "hidden" : "space-y-3"}>
        <div className="border border-rule-strong focus-within:border-ink">
          {editor && (
            <MemoToolbar editor={editor} codeBlockLang={codeBlockLang} isCodeBlockActive={isCodeBlockActive} />
          )}
          <div className="graph-paper">
            <EditorContent editor={editor} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton
            loading={saving}
            loadingLabel="保存中..."
            disabled={!editor || (!dirty && active.kind === "memo")}
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            保存
          </SubmitButton>
          <span className={`text-xs ${message?.isError ? "text-red-pen" : "text-muted-foreground"}`}>
            {message?.text ?? (dirty ? "保存していない変更があります" : active.kind === "memo" ? "保存済み" : "")}
          </span>
          {active.kind === "memo" && (
            <button
              onClick={handleDelete}
              className="ml-auto text-xs text-red-pen hover:underline underline-offset-2"
            >
              このノートを削除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
