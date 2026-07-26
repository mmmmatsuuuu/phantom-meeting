"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { CodeSnippet, CodeLanguage } from "@/lib/db/code-snippets";
import SubmitButton from "@/components/shared/submit-button";

const LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  python: "Python",
  javascript: "JavaScript",
};

type NewSnippetForm = {
  title: string;
  language: CodeLanguage;
  initialCode: string;
};

function createEmptyForm(order: number): NewSnippetForm {
  return { title: `例${order + 1}`, language: "python", initialCode: "" };
}

type EditState = {
  id: string;
  title: string;
  language: CodeLanguage;
  initialCode: string;
};

type Props = {
  lessonId: string;
  initialEnabled: boolean;
  initialSnippets: CodeSnippet[];
};

export default function CodeSnippetsManager({
  lessonId,
  initialEnabled,
  initialSnippets,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [savingToggle, setSavingToggle] = useState(false);
  const [snippets, setSnippets] = useState<CodeSnippet[]>(
    [...initialSnippets].sort((a, b) => a.order - b.order)
  );
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<NewSnippetForm>(createEmptyForm(0));

  const handleToggle = async (next: boolean) => {
    setEnabled(next);
    setSavingToggle(true);
    const res = await fetch(`/api/contents/lessons/${lessonId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enablePlayground: next }),
    });
    setSavingToggle(false);
    if (res.ok) {
      toast.success(next ? "プレイグラウンドを有効にしました" : "プレイグラウンドを無効にしました");
    } else {
      setEnabled(!next);
      toast.error("更新に失敗しました");
    }
  };

  const handleAdd = async () => {
    if (!addForm.initialCode.trim()) {
      toast.error("初期コードを入力してください");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/lessons/${lessonId}/code-snippets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    setSaving(false);
    if (res.ok) {
      const json = (await res.json()) as { data: CodeSnippet };
      setSnippets((prev) => [...prev, json.data]);
      setShowAddForm(false);
      setAddForm(createEmptyForm(snippets.length + 1));
      toast.success("コード例を追加しました");
    } else {
      toast.error("追加に失敗しました");
    }
  };

  const startEdit = (snippet: CodeSnippet) => {
    setEditing({
      id: snippet.id,
      title: snippet.title,
      language: snippet.language,
      initialCode: snippet.initial_code,
    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const res = await fetch(`/api/code-snippets/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editing.title,
        language: editing.language,
        initialCode: editing.initialCode,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSnippets((prev) =>
        prev.map((s) =>
          s.id === editing.id
            ? { ...s, title: editing.title, language: editing.language, initial_code: editing.initialCode }
            : s
        )
      );
      setEditing(null);
      toast.success("更新しました");
    } else {
      toast.error("更新に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このコード例を削除しますか？")) return;
    setDeletingId(id);
    const res = await fetch(`/api/code-snippets/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      setSnippets((prev) => prev.filter((s) => s.id !== id));
      toast.success("削除しました");
    } else {
      toast.error("削除に失敗しました");
    }
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    setMovingId(id);
    const res = await fetch(`/api/lessons/${lessonId}/code-snippets/${id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    setMovingId(null);
    if (res.ok) {
      setSnippets((prev) => {
        const index = prev.findIndex((s) => s.id === id);
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (index === -1 || targetIndex < 0 || targetIndex >= prev.length) return prev;
        const next = [...prev];
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        return next;
      });
    } else {
      toast.error("並び替えに失敗しました");
    }
  };

  return (
    <div className="space-y-6">
      {/* 有効/無効トグル */}
      <div className="p-5 rounded-md border bg-card">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            disabled={savingToggle}
            onChange={(e) => handleToggle(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">プレイグラウンドを有効にする</span>
        </label>
        <p className="text-xs text-muted-foreground mt-1">
          有効にすると、生徒のレッスンページのメモ欄に「💻 コード」タブが表示されます。
        </p>
      </div>

      {/* コード例一覧 */}
      <div className="space-y-3">
        {snippets.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            コード例がありません。下の「コード例を追加」から追加してください。
          </p>
        )}
        {snippets.map((snippet, i) => (
          <div key={snippet.id} className="border rounded-lg p-4 space-y-2 bg-card">
            {editing?.id === snippet.id ? (
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    className="flex-1 px-2 py-1.5 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  />
                  <select
                    className="px-2 py-1.5 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={editing.language}
                    onChange={(e) =>
                      setEditing({ ...editing, language: e.target.value as CodeLanguage })
                    }
                  >
                    {(Object.keys(LANGUAGE_LABELS) as CodeLanguage[]).map((lang) => (
                      <option key={lang} value={lang}>
                        {LANGUAGE_LABELS[lang]}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={6}
                  value={editing.initialCode}
                  onChange={(e) => setEditing({ ...editing, initialCode: e.target.value })}
                />
                <div className="flex gap-2">
                  <SubmitButton
                    loading={saving}
                    loadingLabel="保存中..."
                    onClick={handleSaveEdit}
                    className="px-4 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    保存
                  </SubmitButton>
                  <button
                    onClick={() => setEditing(null)}
                    className="px-4 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{snippet.title}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {LANGUAGE_LABELS[snippet.language]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMove(snippet.id, "up")}
                      disabled={i === 0 || movingId === snippet.id}
                      className="text-xs px-1.5 py-1 rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="上に移動"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMove(snippet.id, "down")}
                      disabled={i === snippets.length - 1 || movingId === snippet.id}
                      className="text-xs px-1.5 py-1 rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="下に移動"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => startEdit(snippet)}
                      className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors ml-1"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(snippet.id)}
                      disabled={deletingId === snippet.id}
                      className="text-xs px-2 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                    >
                      {deletingId === snippet.id ? "削除中..." : "削除"}
                    </button>
                  </div>
                </div>
                <pre className="text-xs bg-muted rounded p-3 overflow-x-auto whitespace-pre-wrap">
                  {snippet.initial_code}
                </pre>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 追加フォーム */}
      {showAddForm ? (
        <div className="border rounded-lg p-4 space-y-3 bg-card border-primary/40">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              className="flex-1 px-2 py-1.5 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="タイトル（例：例1）"
              value={addForm.title}
              onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
            />
            <select
              className="px-2 py-1.5 rounded border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={addForm.language}
              onChange={(e) =>
                setAddForm({ ...addForm, language: e.target.value as CodeLanguage })
              }
            >
              {(Object.keys(LANGUAGE_LABELS) as CodeLanguage[]).map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang]}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="w-full px-3 py-2 rounded-md border bg-background text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            rows={6}
            placeholder={
              addForm.language === "python" ? "print('Hello')" : "console.log('Hello')"
            }
            value={addForm.initialCode}
            onChange={(e) => setAddForm({ ...addForm, initialCode: e.target.value })}
          />
          <div className="flex gap-2">
            <SubmitButton
              loading={saving}
              loadingLabel="追加中..."
              onClick={handleAdd}
              className="flex-1 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              コード例を追加する
            </SubmitButton>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setAddForm(createEmptyForm(snippets.length));
            setShowAddForm(true);
          }}
          className="w-full py-2 text-sm rounded-md border border-dashed hover:bg-muted transition-colors"
        >
          + コード例を追加
        </button>
      )}
    </div>
  );
}
