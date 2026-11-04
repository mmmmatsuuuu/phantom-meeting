"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, type EditorOptions, type JSONContent } from "@tiptap/react";
import { toast } from "sonner";
import MemoToolbar from "@/components/lesson/memo-toolbar";
import SubmitButton from "@/components/shared/submit-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createNoteExtensions } from "@/lib/tiptap/note-extensions";
import { isTiptapDoc, type TiptapDoc } from "@/lib/tiptap-utils";
import { useCodeBlockState } from "@/lib/hooks/use-code-block-state";

// useEditor は拡張を参照で比べるため、描画のたびに作り直さない
const EXTENSIONS = createNoteExtensions({
  placeholder: "穴埋め（【　　】）と「考えてみよう」を入れて、プリントのように書きます",
});

type UploadResponse = { data: { url: string; fileId: string } | null; error: string | null };

type Props = {
  lessonId: string;
  initialContent: TiptapDoc | null;
};

/**
 * ノートのひな形の編集。生徒のノートと同じ見た目（方眼・Klee One）で書く。
 * 画像は貼り付けでアップロードでき、生徒のノートではここで入れた画像だけが使える
 */
export default function NoteTemplateEditor({ lessonId, initialContent }: Props) {
  const router = useRouter();
  const [exists, setExists] = useState(initialContent !== null);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { codeBlockLang, isCodeBlockActive, sync: syncCodeBlock } = useCodeBlockState();
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  // useEditor は editorProps を参照で比べるため、描画のたびに作り直さない
  const editorProps = useMemo<EditorOptions["editorProps"]>(
    () => ({
      attributes: { class: "note-content min-h-[416px] px-4 py-4 focus:outline-none" },
      handlePaste(view, event) {
        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find((item) => item.type.startsWith("image/"));
        const file = imageItem?.getAsFile();
        if (!file) return false;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("purpose", "note-template");
        fetch("/api/images/upload", { method: "POST", body: formData })
          .then((res) => res.json() as Promise<UploadResponse>)
          .then((json) => {
            if (!json.data?.url) {
              toast.error("画像のアップロードに失敗しました");
              return;
            }
            const { state } = view;
            const imageType = state.schema.nodes["image"];
            if (imageType) {
              const node = imageType.create({ src: json.data.url, fileId: json.data.fileId ?? null });
              view.dispatch(state.tr.replaceSelectionWith(node));
            }
          })
          .finally(() => setIsUploading(false));
        return true;
      },
    }),
    []
  );

  const editor = useEditor({
    immediatelyRender: false,
    content: (initialContent ?? undefined) as JSONContent | undefined,
    extensions: EXTENSIONS,
    onTransaction: ({ editor }) => syncCodeBlock(editor),
    editorProps,
  });

  const handleSave = async () => {
    if (!editor) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/memo-template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editor.getJSON() }),
      });
      if (!res.ok) {
        // 長すぎるときなど、直し方が分かる文言はそのまま出す
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(json?.error ?? "保存に失敗しました。もう一度お試しください");
        return;
      }
      setExists(true);
      toast.success("ひな形を保存しました");
      router.refresh();
    } catch {
      toast.error("保存に失敗しました。もう一度お試しください");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("このレッスンのひな形を削除しますか？ 生徒がすでに読み込んだノートは消えません。")) return;
    const res = await fetch(`/api/lessons/${lessonId}/memo-template`, { method: "DELETE" });
    if (res.ok) {
      setExists(false);
      editor?.commands.clearContent();
      toast.success("ひな形を削除しました");
      router.refresh();
    } else {
      toast.error("削除に失敗しました");
    }
  };

  const handleImport = () => {
    try {
      const parsed: unknown = JSON.parse(importText);
      if (!isTiptapDoc(parsed)) {
        setImportError("tiptap の文書（{\"type\": \"doc\", \"content\": [...]}）の形式ではありません");
        return;
      }
      editor?.commands.setContent(parsed as JSONContent);
      setImportOpen(false);
      setImportText("");
      setImportError(null);
      toast.success("読み込みました。内容を確かめてから保存してください");
    } catch {
      setImportError("JSON として読み取れませんでした");
    }
  };

  return (
    <div className="space-y-3">
      <div className="border border-rule-strong">
        {editor && (
          <MemoToolbar editor={editor} codeBlockLang={codeBlockLang} isCodeBlockActive={isCodeBlockActive} />
        )}
        <div className="graph-paper">
          <EditorContent editor={editor} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        画像は貼り付けで入れられます{isUploading && "（アップロード中...）"}。生徒のノートでは、ここで入れた画像だけが使えます。
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton
          loading={saving}
          loadingLabel="保存中..."
          disabled={!editor}
          onClick={handleSave}
          className="px-4 py-2 text-sm rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          保存
        </SubmitButton>
        <button
          onClick={() => setImportOpen(true)}
          className="px-4 py-2 text-sm rounded-sm border border-ink hover:bg-surface transition-colors"
        >
          JSON で読み込む
        </button>
        {exists && (
          <button
            onClick={handleDelete}
            className="ml-auto px-3 py-2 text-sm rounded-sm border border-red-pen/50 text-red-pen hover:bg-red-pen/10 transition-colors"
          >
            ひな形を削除
          </button>
        )}
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>JSON で読み込む</DialogTitle>
            <DialogDescription>
              tiptap の文書 JSON を貼り付けます。形式は docs/note-template-json.md を参照してください。読み込んだあと、保存を押すまでは反映されません。
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={14}
            className="w-full px-3 py-2 font-mono text-xs rounded-sm border border-rule-strong bg-sheet focus:outline-none focus:border-ink"
            placeholder='{"type": "doc", "content": [...]}'
          />
          {importError && <p className="text-xs text-red-pen">{importError}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="px-4 py-2 text-sm rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              エディタに読み込む
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
