"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CodeEditor from "@/components/lesson/code-editor";
import MakerConsole from "@/components/maker/maker-console";
import SubmitButton from "@/components/shared/submit-button";
import type { MakerSettings } from "@/lib/maker-settings";

type Draft = {
  plan: string;
  title: string;
  description: string;
  code: string;
};

type Props = {
  eventId: string;
  eventTitle: string;
  eventDescription: string;
  isOpen: boolean;
  settings: MakerSettings;
  initialDraft: Draft;
  hasStudentNumber: boolean;
  submittedAt: string | null;
  /** 保存済みの下書きが提出後に更新されているか（再読み込みしても再提出できるようにするため） */
  initialHasUnsubmittedChanges: boolean;
  isHidden: boolean;
};

const INPUT_CLASS =
  "w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";

export default function MakerWorkspace({
  eventId,
  eventTitle,
  eventDescription,
  isOpen,
  settings,
  initialDraft,
  hasStudentNumber,
  submittedAt: initialSubmittedAt,
  initialHasUnsubmittedChanges,
  isHidden,
}: Props) {
  const [draft, setDraft] = useState(initialDraft);
  const [saved, setSaved] = useState(initialDraft);
  const [submittedDraft, setSubmittedDraft] = useState<Draft | null>(
    initialSubmittedAt && !initialHasUnsubmittedChanges ? initialDraft : null
  );
  const [submittedAt, setSubmittedAt] = useState(initialSubmittedAt);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const canSubmit =
    isOpen &&
    hasStudentNumber &&
    draft.title.trim() !== "" &&
    draft.description.trim() !== "" &&
    draft.code.trim() !== "";
  const hasUnsubmittedChanges =
    submittedAt !== null && JSON.stringify(draft) !== JSON.stringify(submittedDraft);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const update = (field: keyof Draft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const saveDraft = async (): Promise<boolean> => {
    const res = await fetch(`/api/maker/events/${eventId}/work`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      const { error } = (await res.json()) as { error: string };
      setMessage({ text: error, isError: true });
      return false;
    }
    setSaved(draft);
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      if (await saveDraft()) setMessage({ text: "保存しました", isError: false });
    } catch {
      setMessage({ text: "保存に失敗しました。もう一度お試しください", isError: true });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      if (!(await saveDraft())) return;
      const res = await fetch(`/api/maker/events/${eventId}/submit`, { method: "POST" });
      if (!res.ok) {
        const { error } = (await res.json()) as { error: string };
        setMessage({ text: error, isError: true });
        return;
      }
      setSubmittedDraft(draft);
      setSubmittedAt(new Date().toISOString());
      setMessage({ text: "提出しました", isError: false });
    } catch {
      setMessage({ text: "提出に失敗しました。もう一度お試しください", isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const copyPrompt = async (index: number, body: string) => {
    await navigator.clipboard.writeText(body);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-ink mb-1">🛠 自由制作</p>
          <h1 className="text-2xl font-bold">{eventTitle}</h1>
        </div>
        <Link
          href={`/maker/${eventId}/gallery`}
          className="px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
        >
          🎮 みんなの作品
        </Link>
      </div>

      {eventDescription && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{eventDescription}</p>
      )}

      {!isOpen && (
        <p className="rounded-md border p-3 text-sm text-muted-foreground">
          提出の受付は終了しました。作品を変更することはできません。
        </p>
      )}
      {isOpen && !hasStudentNumber && (
        <p className="rounded-md border border-rule-strong bg-surface p-3 text-sm">
          提出には学籍番号が必要です。
          <Link href="/profile" className="underline ml-1">
            プロフィール
          </Link>
          で設定してください。
        </p>
      )}
      {isHidden && (
        <p className="rounded-md border border-red-pen/50 bg-red-pen/10 p-3 text-sm">
          この作品は先生により公開停止されています。先生に確認してください。
        </p>
      )}

      {(settings.prompts.length > 0 || settings.examples.length > 0) && (
        <details className="rounded-md border bg-card p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            💡 何を作るか迷ったら（作品例・AIに相談するプロンプト）
          </summary>
          <div className="mt-4 space-y-5">
            {settings.examples.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold">作品例</h2>
                {settings.examples.map((example, index) => (
                  <div key={index} className="rounded-md border p-3 space-y-2">
                    <p className="text-sm font-medium">{example.title}</p>
                    {example.description && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {example.description}
                      </p>
                    )}
                    {example.code && (
                      <pre className="text-xs font-mono bg-muted/40 rounded p-2 overflow-x-auto">
                        {example.code}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
            {settings.prompts.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold">AIに相談するプロンプト</h2>
                {settings.prompts.map((prompt, index) => (
                  <div key={index} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{prompt.title}</p>
                      <button
                        onClick={() => copyPrompt(index, prompt.body)}
                        className="px-2.5 py-1 text-xs rounded-md border hover:bg-muted transition-colors shrink-0"
                      >
                        {copiedIndex === index ? "コピーしました" : "📋 コピー"}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {prompt.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-semibold">① 何を作る？（課題設定）</span>
            <textarea
              value={draft.plan}
              onChange={(e) => update("plan", e.target.value)}
              disabled={!isOpen}
              maxLength={2000}
              rows={4}
              placeholder="作りたいもの、作りたい理由、使う命令（if / for / リストなど）"
              className={INPUT_CLASS}
            />
            <span className="block text-xs text-muted-foreground">
              ここは先生だけが読みます。他の生徒には公開されません。
            </span>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">② 作品名</span>
            <input
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
              disabled={!isOpen}
              maxLength={100}
              className={INPUT_CLASS}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">③ 説明</span>
            <textarea
              value={draft.description}
              onChange={(e) => update("description", e.target.value)}
              disabled={!isOpen}
              maxLength={2000}
              rows={5}
              placeholder="どのように使うのか、使うと何ができるのか"
              className={INPUT_CLASS}
            />
          </label>
        </div>

        <div className="space-y-3 min-w-0">
          <span className="text-sm font-semibold">④ コード（Python）</span>
          <CodeEditor
            language="python"
            initialValue={draft.code}
            onChange={(value) => update("code", value)}
          />
          <MakerConsole code={draft.code} />
        </div>
      </div>

      {isOpen && (
        <div className="sticky bottom-0 bg-background/95 border-t py-3 flex flex-wrap items-center gap-3">
          <SubmitButton
            loading={saving}
            loadingLabel="保存中..."
            disabled={!isDirty || submitting}
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            💾 保存
          </SubmitButton>
          <SubmitButton
            loading={submitting}
            loadingLabel="提出中..."
            disabled={!canSubmit || saving || (submittedAt !== null && !hasUnsubmittedChanges)}
            onClick={handleSubmit}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submittedAt ? "🚀 再提出" : "🚀 提出"}
          </SubmitButton>
          <p
            className={`text-xs ${message?.isError ? "text-red-pen" : "text-muted-foreground"}`}
          >
            {message?.text ??
              (isDirty
                ? "未保存の変更があります"
                : hasUnsubmittedChanges
                  ? "保存済みです。公開中の作品に反映するには再提出してください"
                  : submittedAt
                    ? "提出済みです。提出した作品は他の生徒にも共有されます"
                    : "提出すると、作品は他の生徒にも共有されます")}
          </p>
        </div>
      )}
    </div>
  );
}
