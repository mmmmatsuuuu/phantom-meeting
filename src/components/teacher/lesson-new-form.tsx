"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SubjectWithUnits } from "@/lib/db/contents";

type QuestionInput = {
  id: string;
  content: string;
};

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  return match?.[1] ?? null;
}

type Props = {
  subjects: SubjectWithUnits[];
};

export default function LessonNewForm({ subjects }: Props) {
  const [subjectId, setSubjectId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [questions, setQuestions] = useState<QuestionInput[]>([
    { id: "1", content: "" },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const units = selectedSubject?.units ?? [];
  const videoId = extractVideoId(youtubeUrl);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { id: String(Date.now()), content: "" },
    ]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, content: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, content } : q))
    );
  };

  const handleSave = async () => {
    if (!unitId || !title.trim() || !youtubeUrl.trim()) {
      toast.error("科目・単元・タイトル・YouTube URL は必須です");
      return;
    }
    if (!videoId) {
      toast.error("有効な YouTube URL を入力してください");
      return;
    }
    setIsSaving(true);
    const res = await fetch("/api/contents/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unitId,
        title: title.trim(),
        youtubeUrl: youtubeUrl.trim(),
        questions: questions.map((q) => q.content).filter((c) => c.trim() !== ""),
      }),
    });
    setIsSaving(false);
    if (res.status === 201) {
      toast.success("レッスンを登録しました");
      router.push("/");
    } else {
      toast.error("登録に失敗しました");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">📺 レッスンを登録する</h1>
        <p className="text-sm text-muted-foreground">
          動画と ❓ 発問を登録して、生徒の探究を促しましょう。
        </p>
      </div>

      <div className="space-y-5">
        {/* 科目・単元 */}
        <div className="p-5 rounded-md border bg-card space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            分類
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">科目</label>
              <select
                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setUnitId("");
                }}
              >
                <option value="">選択してください</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">単元</label>
              <select
                className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                disabled={!subjectId}
              >
                <option value="">選択してください</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 動画情報 */}
        <div className="p-5 rounded-md border bg-card space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            動画
          </h2>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">タイトル</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="例：CPUとメモリの役割"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">YouTube URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                className="flex-1 px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value);
                  setShowPreview(false);
                }}
              />
              <button
                onClick={() => setShowPreview(true)}
                disabled={!videoId}
                className="px-3 py-2 rounded-md border text-sm hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🔍 プレビュー
              </button>
            </div>
            {showPreview && videoId && (
              <div className="w-full aspect-video rounded-md overflow-hidden bg-black mt-2">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="プレビュー"
                />
              </div>
            )}
          </div>
        </div>

        {/* 発問 */}
        <div className="p-5 rounded-md border bg-card space-y-4">
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              ❓ 発問
            </h2>
            <p className="text-xs text-muted-foreground">
              正解のない問いを設定しましょう。生徒のメモ・思考のきっかけになります。
            </p>
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={q.id} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Q{i + 1}
                  </label>
                  <textarea
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={2}
                    placeholder="生徒への発問を入力してください..."
                    value={q.content}
                    onChange={(e) => updateQuestion(q.id, e.target.value)}
                  />
                </div>
                <button
                  onClick={() => removeQuestion(q.id)}
                  disabled={questions.length === 1}
                  className="mt-5 p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="発問を削除"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addQuestion}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ＋ 発問を追加
          </button>
        </div>

        {/* 保存ボタン */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSaving ? "登録中..." : "保存する"}
        </button>
      </div>
    </div>
  );
}
