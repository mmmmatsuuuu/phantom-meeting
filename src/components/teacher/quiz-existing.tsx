"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { QuizWithQuestions, QuizQuestion, QuizQuestionType } from "@/lib/db/quizzes";
import RichContent from "@/components/shared/rich-content";
import QuizQuestionEditor from "@/components/teacher/quiz-question-editor";

// --------------- 定数 ---------------

const QUESTION_TYPE_LABELS: Record<QuizQuestionType, string> = {
  multiple_choice: "選択式",
  short_answer: "記述式",
  ordering: "並び替え",
};

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

// --------------- 既存問題の詳細表示 ---------------

function QuestionDetail({ question }: { question: QuizQuestion }) {
  const type = question.type;
  const options = question.options as string[] | null;
  const correctAnswer = question.correct_answer;
  const explanation = question.explanation as Record<string, unknown> | null;

  return (
    <div className="space-y-2 text-sm">
      {/* 問題文 */}
      <RichContent content={question.content as Record<string, unknown>} />

      {/* 選択式: 選択肢と正解 */}
      {type === "multiple_choice" && options && (
        <div className="pl-2 space-y-1 pt-1">
          <p className="text-xs font-medium text-muted-foreground">選択肢</p>
          {options.map((opt, i) => {
            const correct = (correctAnswer as { index: number }).index;
            return (
              <div
                key={i}
                className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
                  i === correct
                    ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {i === correct ? "✓" : "○"} {String.fromCharCode(65 + i)}. {opt}
              </div>
            );
          })}
        </div>
      )}

      {/* 記述式: 模範解答 */}
      {type === "short_answer" && (
        <div className="pl-2 pt-1">
          <p className="text-xs font-medium text-muted-foreground">模範解答</p>
          <p className="text-xs mt-0.5">
            {(correctAnswer as { text: string }).text || "（未設定）"}
          </p>
        </div>
      )}

      {/* 並び替え: 正解順 */}
      {type === "ordering" && options && (
        <div className="pl-2 pt-1">
          <p className="text-xs font-medium text-muted-foreground">正解順</p>
          <ol className="text-xs mt-0.5 space-y-0.5 list-decimal list-inside">
            {(correctAnswer as string[]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </div>
      )}

      {/* 解説 */}
      {explanation && (
        <div className="pl-2 pt-1 border-t mt-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">解説</p>
          <RichContent content={explanation} />
        </div>
      )}
    </div>
  );
}

// --------------- 問題追加フォーム ---------------

type AddFormState = {
  type: QuizQuestionType;
  content: Record<string, unknown>;
  explanation: Record<string, unknown>;
  options: string[];
  correctAnswerIndex: number;
  correctAnswerText: string;
};

function createEmptyForm(): AddFormState {
  return {
    type: "multiple_choice",
    content: EMPTY_DOC,
    explanation: EMPTY_DOC,
    options: ["", ""],
    correctAnswerIndex: 0,
    correctAnswerText: "",
  };
}

type AddQuestionFormProps = {
  quizId: string;
  formKey: number;
  onAdded: (question: QuizQuestion) => void;
  onCancel: () => void;
};

function AddQuestionForm({ quizId, formKey, onAdded, onCancel }: AddQuestionFormProps) {
  const [form, setForm] = useState<AddFormState>(createEmptyForm());
  const [saving, setSaving] = useState(false);

  const handleContentChange = useCallback(
    (_uid: string, content: Record<string, unknown>) => {
      setForm((prev) => ({ ...prev, content }));
    },
    []
  );

  const handleExplanationChange = useCallback(
    (_uid: string, explanation: Record<string, unknown>) => {
      setForm((prev) => ({ ...prev, explanation }));
    },
    []
  );

  const addOption = () => {
    setForm((prev) => ({ ...prev, options: [...prev.options, ""] }));
  };

  const removeOption = (index: number) => {
    setForm((prev) => {
      const options = prev.options.filter((_, i) => i !== index);
      return {
        ...prev,
        options,
        correctAnswerIndex:
          prev.correctAnswerIndex >= options.length
            ? Math.max(0, options.length - 1)
            : prev.correctAnswerIndex,
      };
    });
  };

  const handleAdd = async () => {
    const explanation =
      JSON.stringify(form.explanation) !== JSON.stringify(EMPTY_DOC)
        ? form.explanation
        : null;

    let options: string[] | null = null;
    let correctAnswer:
      | { index: number }
      | { text: string }
      | string[];

    if (form.type === "multiple_choice") {
      options = form.options;
      correctAnswer = { index: form.correctAnswerIndex };
    } else if (form.type === "short_answer") {
      options = null;
      correctAnswer = { text: form.correctAnswerText };
    } else {
      options = form.options;
      correctAnswer = [...form.options];
    }

    setSaving(true);
    const res = await fetch(`/api/quizzes/${quizId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        content: form.content,
        explanation,
        options,
        correctAnswer,
      }),
    });
    setSaving(false);

    if (res.ok) {
      const json = (await res.json()) as { data: QuizQuestion };
      toast.success("問題を追加しました");
      onAdded(json.data);
    } else {
      toast.error("問題の追加に失敗しました");
    }
  };

  return (
    <div key={formKey} className="border rounded-lg p-4 space-y-3 bg-card border-primary/40">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">新しい問題</span>
        <div className="flex items-center gap-2">
          <select
            value={form.type}
            onChange={(e) => {
              const type = e.target.value as QuizQuestionType;
              setForm((prev) => ({
                ...prev,
                type,
                options: ["", ""],
                correctAnswerIndex: 0,
                correctAnswerText: "",
              }));
            }}
            className="text-xs border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {(Object.keys(QUESTION_TYPE_LABELS) as QuizQuestionType[]).map((t) => (
              <option key={t} value={t}>
                {QUESTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 問題文 */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">問題文</p>
        <QuizQuestionEditor
          uid="add-content"
          initialContent={form.content}
          onChange={handleContentChange}
          placeholder="問題文を入力..."
        />
      </div>

      {/* 選択式 */}
      {form.type === "multiple_choice" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            選択肢（正解をラジオボタンで選択、最低2つ）
          </p>
          {form.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="add-correct"
                checked={form.correctAnswerIndex === i}
                onChange={() => setForm((prev) => ({ ...prev, correctAnswerIndex: i }))}
                className="shrink-0"
              />
              <input
                type="text"
                value={opt}
                onChange={(e) => {
                  const options = [...form.options];
                  options[i] = e.target.value;
                  setForm((prev) => ({ ...prev, options }));
                }}
                placeholder={`選択肢 ${String.fromCharCode(65 + i)}`}
                className="flex-1 border rounded px-2 py-1 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {form.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="text-xs text-destructive hover:underline shrink-0"
                >
                  削除
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            className="text-xs text-primary hover:underline"
          >
            + 選択肢を追加
          </button>
        </div>
      )}

      {/* 記述式 */}
      {form.type === "short_answer" && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">模範解答</p>
          <input
            type="text"
            value={form.correctAnswerText}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, correctAnswerText: e.target.value }))
            }
            placeholder="模範解答を入力"
            className="w-full border rounded px-2 py-1 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      {/* 並び替え */}
      {form.type === "ordering" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            並び替え要素（正しい順番で入力、最低2つ）
          </p>
          {form.options.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const options = [...form.options];
                  options[i] = e.target.value;
                  setForm((prev) => ({ ...prev, options }));
                }}
                placeholder={`要素 ${i + 1}`}
                className="flex-1 border rounded px-2 py-1 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {form.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="text-xs text-destructive hover:underline"
                >
                  削除
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            className="text-xs text-primary hover:underline"
          >
            + 要素を追加
          </button>
        </div>
      )}

      {/* 解説 */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">解説（任意）</p>
        <QuizQuestionEditor
          uid="add-explanation"
          initialContent={form.explanation}
          onChange={handleExplanationChange}
          placeholder="解説を入力（省略可）..."
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving}
          className="flex-1 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {saving ? "追加中..." : "問題を追加する"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

// --------------- メインコンポーネント ---------------

type Props = {
  quiz: QuizWithQuestions;
};

export default function QuizExisting({ quiz }: Props) {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuizQuestion[]>(quiz.questions);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingQuiz, setDeletingQuiz] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormKey, setAddFormKey] = useState(0);

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("この問題を削除しますか？")) return;
    setDeletingId(questionId);
    const res = await fetch(`/api/quiz-questions/${questionId}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      toast.success("問題を削除しました");
    } else {
      toast.error("削除に失敗しました");
    }
  };

  const handleDeleteQuiz = async () => {
    if (!confirm("クイズ全体を削除しますか？すべての問題も削除されます。")) return;
    setDeletingQuiz(true);
    const res = await fetch(`/api/quizzes/${quiz.id}`, { method: "DELETE" });
    setDeletingQuiz(false);
    if (res.ok) {
      toast.success("クイズを削除しました");
      router.refresh();
    } else {
      toast.error("削除に失敗しました");
    }
  };

  const handleQuestionAdded = (question: QuizQuestion) => {
    setQuestions((prev) => [...prev, question]);
    setShowAddForm(false);
    setAddFormKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{quiz.title}</h2>
          <p className="text-sm text-muted-foreground">{questions.length} 問</p>
        </div>
        <button
          onClick={handleDeleteQuiz}
          disabled={deletingQuiz}
          className="shrink-0 text-sm px-3 py-1.5 rounded-md border text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
        >
          {deletingQuiz ? "削除中..." : "🗑️ クイズを削除"}
        </button>
      </div>

      {/* 問題一覧 */}
      <div className="space-y-3">
        {questions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            問題がありません。下の「問題を追加」から追加してください。
          </p>
        )}
        {questions.map((q, i) => (
          <div key={q.id} className="border rounded-lg p-4 space-y-2 bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">問題 {i + 1}</span>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {QUESTION_TYPE_LABELS[q.type]}
                </span>
              </div>
              <button
                onClick={() => handleDeleteQuestion(q.id)}
                disabled={deletingId === q.id}
                className="text-xs text-destructive hover:underline disabled:opacity-40"
              >
                {deletingId === q.id ? "削除中..." : "削除"}
              </button>
            </div>
            <QuestionDetail question={q} />
          </div>
        ))}
      </div>

      {/* 問題追加 */}
      {showAddForm ? (
        <AddQuestionForm
          quizId={quiz.id}
          formKey={addFormKey}
          onAdded={handleQuestionAdded}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="w-full py-2 text-sm rounded-md border border-dashed hover:bg-muted transition-colors"
        >
          + 問題を追加
        </button>
      )}
    </div>
  );
}
