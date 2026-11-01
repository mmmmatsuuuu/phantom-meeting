"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SubmitButton from "@/components/shared/submit-button";

export default function MakerNewEventForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/maker/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error();
      const { data } = (await res.json()) as { data: { id: string } };
      router.push(`/teacher/maker/${data.id}`);
    } catch {
      setError("作成に失敗しました。もう一度お試しください");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="課題名（例: 自由制作プログラム）"
          className="flex-1 min-w-0 px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <SubmitButton
          loading={saving}
          loadingLabel="作成中..."
          disabled={title.trim() === ""}
          onClick={handleCreate}
          className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          作成
        </SubmitButton>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
