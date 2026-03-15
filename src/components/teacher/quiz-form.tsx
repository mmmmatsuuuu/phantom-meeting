"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import QuizQuestionEditor from "@/components/teacher/quiz-question-editor";
import type { QuizQuestionType } from "@/lib/db/quizzes";

const QUESTION_TYPE_LABELS: Record<QuizQuestionType, string> = {
  multiple_choice: "選択式",
  short_answer: "記述式",
  ordering: "並び替え",
};

type QuestionFormData = {
  uid: string;
  type: QuizQuestionType;
  content: Record<string, unknown>;
  options: string[];
  correctAnswerIndex: number;
  correctAnswerText: string;
};

function createEmptyQuestion(type: QuizQuestionType): QuestionFormData {
  return {
    uid: crypto.randomUUID(),
    type,
    content: { type: "doc", content: [{ type: "paragraph" }] },
    options: type === "multiple_choice" ? ["", "", "", ""] : ["", ""],
    correctAnswerIndex: 0,
    correctAnswerText: "",
  };
}

type Props = {
  lessonId: string;
};

export default function QuizForm({ lessonId }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<QuestionFormData[]>([
    createEmptyQuestion("multiple_choice"),
  ]);
  const [saving, setSaving] = useState(false);

  const handleContentChange = useCallback(
    (uid: string, content: Record<string, unknown>) => {
      setQuestions((prev) =>
        prev.map((q) => (q.uid === uid ? { ...q, content } : q))
      );
    },
    []
  );

  const updateQuestion = (uid: string, patch: Partial<QuestionFormData>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.uid === uid ? { ...q, ...patch } : q))
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion("multiple_choice")]);
  };

  const removeQuestion = (uid: string) => {
    setQuestions((prev) => prev.filter((q) => q.uid !== uid));
  };

  const addOption = (uid: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.uid === uid ? { ...q, options: [...q.options, ""] } : q
      )
    );
  };

  const removeOption = (uid: string, index: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.uid !== uid) return q;
        const options = q.options.filter((_, i) => i !== index);
        return {
          ...q,
          options,
          correctAnswerIndex:
            q.correctAnswerIndex >= options.length
              ? Math.max(0, options.length - 1)
              : q.correctAnswerIndex,
        };
      })
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("クイズのタイトルを入力してください");
      return;
    }
    if (questions.length === 0) {
      toast.error("問題を1つ以上追加してください");
      return;
    }

    const payload = {
      lessonId,
      title: title.trim(),
      questions: questions.map((q) => {
        if (q.type === "multiple_choice") {
          return {
            type: q.type,
            content: q.content,
            options: q.options,
            correctAnswer: { index: q.correctAnswerIndex },
          };
        }
        if (q.type === "short_answer") {
          return {
            type: q.type,
            content: q.content,
            options: null,
            correctAnswer: { text: q.correctAnswerText },
          };
        }
        // ordering: 入力順が正解順
        return {
          type: q.type,
          content: q.content,
          options: q.options,
          correctAnswer: [...q.options],
        };
      }),
    };

    setSaving(true);
    const res = await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (res.ok) {
      toast.success("クイズを作成しました");
      router.push("/teacher/contents");
    } else {
      toast.error("クイズの作成に失敗しました");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <label className="text-sm font-medium">クイズタイトル</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 第1章 理解確認テスト"
          className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-4">
        {questions.map((q, index) => (
          <div key={q.uid} className="border rounded-lg p-4 space-y-3 bg-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">問題 {index + 1}</span>
              <div className="flex items-center gap-2">
                <select
                  value={q.type}
                  onChange={(e) => {
                    const type = e.target.value as QuizQuestionType;
                    updateQuestion(q.uid, {
                      type,
                      options:
                        type === "multiple_choice" ? ["", "", "", ""] : ["", ""],
                      correctAnswerIndex: 0,
                      correctAnswerText: "",
                    });
                  }}
                  className="text-xs border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {(Object.keys(QUESTION_TYPE_LABELS) as QuizQuestionType[]).map(
                    (t) => (
                      <option key={t} value={t}>
                        {QUESTION_TYPE_LABELS[t]}
                      </option>
                    )
                  )}
                </select>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.uid)}
                    className="text-xs text-destructive hover:underline"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">問題文</p>
              <QuizQuestionEditor
                uid={q.uid}
                initialContent={q.content}
                onChange={handleContentChange}
              />
            </div>

            {q.type === "multiple_choice" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  選択肢（正解をラジオボタンで選択）
                </p>
                {q.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${q.uid}`}
                      checked={q.correctAnswerIndex === i}
                      onChange={() => updateQuestion(q.uid, { correctAnswerIndex: i })}
                      className="shrink-0"
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const options = [...q.options];
                        options[i] = e.target.value;
                        updateQuestion(q.uid, { options });
                      }}
                      placeholder={`選択肢 ${String.fromCharCode(65 + i)}`}
                      className="flex-1 border rounded px-2 py-1 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                ))}
              </div>
            )}

            {q.type === "short_answer" && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">模範解答</p>
                <input
                  type="text"
                  value={q.correctAnswerText}
                  onChange={(e) =>
                    updateQuestion(q.uid, { correctAnswerText: e.target.value })
                  }
                  placeholder="模範解答を入力"
                  className="w-full border rounded px-2 py-1 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}

            {q.type === "ordering" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  並び替え要素（正しい順番で入力）
                </p>
                {q.options.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">
                      {i + 1}.
                    </span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const options = [...q.options];
                        options[i] = e.target.value;
                        updateQuestion(q.uid, { options });
                      }}
                      placeholder={`要素 ${i + 1}`}
                      className="flex-1 border rounded px-2 py-1 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    {q.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(q.uid, i)}
                        className="text-xs text-destructive hover:underline"
                      >
                        削除
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addOption(q.uid)}
                  className="text-xs text-primary hover:underline"
                >
                  + 要素を追加
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addQuestion}
        className="w-full py-2 text-sm rounded-md border border-dashed hover:bg-muted transition-colors"
      >
        + 問題を追加
      </button>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving}
        className="w-full py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? "保存中..." : "クイズを保存する"}
      </button>
    </div>
  );
}
