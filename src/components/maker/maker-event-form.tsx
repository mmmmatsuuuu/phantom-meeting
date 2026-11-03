"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SubmitButton from "@/components/shared/submit-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { MakerStatus } from "@/lib/db/maker";
import type { MakerSettings } from "@/lib/maker-settings";

type UnitOption = { id: string; label: string };

type Props = {
  eventId: string;
  initialTitle: string;
  initialDescription: string;
  initialUnitId: string | null;
  initialStatus: MakerStatus;
  initialSettings: MakerSettings;
  units: UnitOption[];
};

const INPUT_CLASS =
  "w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring";

const STATUS_OPTIONS: { value: MakerStatus; label: string }[] = [
  { value: "draft", label: "下書き（生徒に見えない）" },
  { value: "open", label: "受付中（生徒が制作・提出できる）" },
  { value: "closed", label: "受付終了（閲覧のみ）" },
];

export default function MakerEventForm({
  eventId,
  initialTitle,
  initialDescription,
  initialUnitId,
  initialStatus,
  initialSettings,
  units,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [unitId, setUnitId] = useState(initialUnitId ?? "");
  const [status, setStatus] = useState(initialStatus);
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updatePrompt = (index: number, field: "title" | "body", value: string) => {
    setSettings((prev) => ({
      ...prev,
      prompts: prev.prompts.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    }));
  };

  const updateExample = (
    index: number,
    field: "title" | "description" | "code",
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      examples: prev.examples.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/maker/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, unitId: unitId || null, status, settings }),
      });
      if (!res.ok) throw new Error();
      setMessage({ text: "保存しました", isError: false });
      router.refresh();
    } catch {
      setMessage({ text: "保存に失敗しました。もう一度お試しください", isError: true });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/maker/events/${eventId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/teacher/maker");
    } else {
      setMessage({ text: "削除に失敗しました", isError: true });
    }
  };

  return (
    <div className="space-y-5">
      <label className="block space-y-1">
        <span className="text-sm font-semibold">課題名</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          className={INPUT_CLASS}
        />
      </label>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block space-y-1">
          <span className="text-sm font-semibold">公開状態</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as MakerStatus)}
            className={INPUT_CLASS}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">表示する単元</span>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">未設定（レッスン一覧に出ない）</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-semibold">課題の詳細</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          rows={6}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-semibold">初期コード（Python）</span>
        <textarea
          value={settings.starterCode}
          onChange={(e) => setSettings((prev) => ({ ...prev, starterCode: e.target.value }))}
          rows={5}
          className={`${INPUT_CLASS} font-mono`}
        />
        <span className="block text-xs text-muted-foreground">
          生徒が初めて課題を開いたときに、エディタに入っているコードです。
        </span>
      </label>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">AIに相談するプロンプト</h2>
        {settings.prompts.map((prompt, index) => (
          <div key={index} className="rounded-md border p-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={prompt.title}
                onChange={(e) => updatePrompt(index, "title", e.target.value)}
                placeholder="見出し（例: 作るものを決めたい）"
                className={INPUT_CLASS}
              />
              <button
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    prompts: prev.prompts.filter((_, i) => i !== index),
                  }))
                }
                className="px-3 text-sm rounded-md border hover:bg-muted transition-colors shrink-0"
              >
                削除
              </button>
            </div>
            <textarea
              value={prompt.body}
              onChange={(e) => updatePrompt(index, "body", e.target.value)}
              rows={4}
              placeholder="生徒がコピーしてAIに貼り付ける文章"
              className={INPUT_CLASS}
            />
          </div>
        ))}
        <button
          onClick={() =>
            setSettings((prev) => ({
              ...prev,
              prompts: [...prev.prompts, { title: "", body: "" }],
            }))
          }
          className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors"
        >
          ＋ プロンプトを追加
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">作品例</h2>
        {settings.examples.map((example, index) => (
          <div key={index} className="rounded-md border p-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={example.title}
                onChange={(e) => updateExample(index, "title", e.target.value)}
                placeholder="作品例の名前（例: じゃんけん）"
                className={INPUT_CLASS}
              />
              <button
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    examples: prev.examples.filter((_, i) => i !== index),
                  }))
                }
                className="px-3 text-sm rounded-md border hover:bg-muted transition-colors shrink-0"
              >
                削除
              </button>
            </div>
            <textarea
              value={example.description}
              onChange={(e) => updateExample(index, "description", e.target.value)}
              rows={2}
              placeholder="説明"
              className={INPUT_CLASS}
            />
            <textarea
              value={example.code}
              onChange={(e) => updateExample(index, "code", e.target.value)}
              rows={4}
              placeholder="コード（省略可）"
              className={`${INPUT_CLASS} font-mono`}
            />
          </div>
        ))}
        <button
          onClick={() =>
            setSettings((prev) => ({
              ...prev,
              examples: [...prev.examples, { title: "", description: "", code: "" }],
            }))
          }
          className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors"
        >
          ＋ 作品例を追加
        </button>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <SubmitButton
          loading={saving}
          loadingLabel="保存中..."
          disabled={title.trim() === ""}
          onClick={handleSave}
          className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          保存
        </SubmitButton>
        <a
          href={`/api/maker/events/${eventId}/export`}
          className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
        >
          📤 提出物をJSONで書き出す
        </a>
        <button
          onClick={() => setDeleteOpen(true)}
          className="px-4 py-2 text-sm rounded-md border text-red-pen hover:bg-muted transition-colors"
        >
          課題を削除
        </button>
        {message && (
          <p
            className={`text-xs ${message.isError ? "text-red-pen" : "text-muted-foreground"}`}
          >
            {message.text}
          </p>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>課題を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              生徒の下書きと提出物もすべて削除され、元に戻せません。作品を残す場合は、先にJSONで書き出してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>削除する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
