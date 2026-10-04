"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLazyFetch } from "@/lib/hooks/use-lazy-fetch";
import { PROMPT_CHAR_LIMIT, buildReviewPrompt, type ReviewData } from "@/lib/review-prompt";

type Props = {
  unitId: string;
  unitName: string;
};

/**
 * 単元の学習データを埋め込んだ AI 振り返りプロンプトを表示・コピーするダイアログ（Phase 19b）。
 * データはダイアログを開いたときだけ取得する。
 */
export default function ReviewPromptDialog({ unitId, unitName }: Props) {
  const [open, setOpen] = useState(false);
  const [includeMemoText, setIncludeMemoText] = useState(true);
  const [now] = useState(() => new Date());
  const { data, error, loading } = useLazyFetch<ReviewData>(
    `/api/units/${unitId}/review-data`,
    open,
    "学習データの取得に失敗しました"
  );

  const prompt = useMemo(
    () => (data ? buildReviewPrompt(data, { includeMemoText, now }) : null),
    [data, includeMemoText, now]
  );

  const handleCopy = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt.text);
      toast.success("コピーしました。使いたい AI に貼り付けてください");
    } catch {
      toast.error("コピーに失敗しました。プレビューを選択してコピーしてください");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="xs">
          🤖 AIで振り返る
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🤖 AIで振り返る：{unitName}</DialogTitle>
          <DialogDescription>
            この単元のあなたの学習データ（小テスト・メモ・コード）を入れたプロンプトです。
            コピーして使いたい AI に貼り付けると、AI がデータを読んで質問してきます。そこから自由に相談してみましょう。
          </DialogDescription>
        </DialogHeader>

        <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
          <li>名前・学籍番号などの個人情報は書き足さないでください</li>
          <li>AI の答えが間違っていることもあります。うのみにせず、授業の内容と照らし合わせましょう</li>
        </ul>

        {loading && (
          <div className="h-64 rounded-md border bg-muted/40 animate-pulse" />
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {prompt && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeMemoText}
                onChange={(e) => setIncludeMemoText(e.target.checked)}
              />
              メモの本文を含める
            </label>

            <textarea
              readOnly
              value={prompt.text}
              className="w-full h-64 rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed"
              onFocus={(e) => e.currentTarget.select()}
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>
                  {prompt.length.toLocaleString()}字（上限 {PROMPT_CHAR_LIMIT.toLocaleString()}字）
                </p>
                {prompt.memoTrimmed && <p>※ 上限に収めるため、メモの本文を短くしています</p>}
                {prompt.omittedCodeLessonCount > 0 && (
                  <p>
                    ※ 上限に収めるため、前半の {prompt.omittedCodeLessonCount} レッスンのコードを省いています
                  </p>
                )}
              </div>
              <Button onClick={handleCopy}>📋 コピーする</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
