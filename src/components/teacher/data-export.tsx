"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { SubjectWithUnits } from "@/lib/db/contents";

const GRADES = [1, 2, 3] as const;

const AI_PROMPT_TEMPLATE = `【実施した単元の計画】
（ここに単元計画を貼り付ける）

【小テスト結果】
（ダウンロードしたCSVファイルを添付、または以下の文章を削除してここに貼り付ける）
添付のCSVファイルを参照

【次回の単元について】
（ここに単元計画を貼り付ける）

---
以上のデータをもとに、実施した単元について以下の観点で考察してください。
- 目標の達成度
- 授業構成・時間配分
- 生徒のストロングポイント（得意）
- 生徒のウィークポイント（つまづき）
- 生徒の興味関心
また、考察を踏まえて次回の単元に向けた改善案や実施上の注意点を挙げてください。`;

type Props = {
  subjects: SubjectWithUnits[];
};

export default function DataExport({ subjects }: Props) {
  const [grade, setGrade] = useState<number | "">("");
  const [subjectId, setSubjectId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const units = selectedSubject?.units ?? [];

  const handleSubjectChange = (id: string) => {
    setSubjectId(id);
    setUnitId("");
  };

  const canDownload = grade !== "" && subjectId !== "" && unitId !== "";

  const handleDownload = async () => {
    if (!canDownload) return;
    setDownloading(true);
    try {
      const url = `/api/teacher/units/${unitId}/quiz-export?grade=${grade}`;
      const res = await fetch(url);
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        toast.error(json.error ?? "エクスポートに失敗しました");
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      link.download = match ? decodeURIComponent(match[1]) : "quiz_export.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success("CSVをダウンロードしました");
    } catch {
      toast.error("エクスポートに失敗しました");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT_TEMPLATE);
      toast.success("コピーしました");
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* 小テスト結果 */}
      <div className="rounded-lg border bg-card p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold">小テスト結果</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            単元の小テスト結果を AI が読み込みやすい CSV 形式でダウンロードします。
            各生徒の最新受験のみを集計します。
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">学年</label>
            <select
              value={grade}
              onChange={(e) =>
                setGrade(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">選択...</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}年生
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">科目</label>
            <select
              value={subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">選択...</option>
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
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              disabled={!subjectId}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">選択...</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleDownload}
            disabled={!canDownload || downloading}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {downloading ? "ダウンロード中..." : "CSV をダウンロード"}
          </button>
          <button
            onClick={() => setShowPrompt((v) => !v)}
            className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
          >
            {showPrompt ? "▲ AI プロンプトを隠す" : "▼ AI プロンプトを表示"}
          </button>
        </div>

        {showPrompt && (
          <div className="rounded-md border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">AI 分析プロンプトテンプレート</span>
              <button
                onClick={handleCopyPrompt}
                className="text-xs px-3 py-1 rounded border hover:bg-muted transition-colors"
              >
                コピー
              </button>
            </div>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
              {AI_PROMPT_TEMPLATE}
            </pre>
          </div>
        )}
      </div>

      {/* 将来の拡張セクション（プレースホルダー） */}
      <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        動画視聴履歴・メモデータのエクスポートは今後追加予定です
      </div>
    </div>
  );
}
