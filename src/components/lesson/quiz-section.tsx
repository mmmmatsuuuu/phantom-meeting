"use client";

import { useState, useMemo, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import RichContent from "@/components/shared/rich-content";
import SubmitButton from "@/components/shared/submit-button";
import type { QuizWithQuestions, QuizQuestion } from "@/lib/db/quizzes";

// --------------- 型 ---------------

type MultipleChoiceAnswer = { index: number };
type ShortAnswerCorrect = { text: string };

type Answer =
  | {
      type: "multiple_choice";
      selectedIndex: number | null;
      // DBのインデックスではなくシャッフル済み配列を保持し、採点は文字列比較で行う
      shuffledOptions: string[];
    }
  | { type: "short_answer"; text: string }
  | { type: "ordering"; items: string[] };

type QuizState = "answering" | "submitted";

// --------------- 並び替えアイテム ---------------

type SortableItemProps = {
  id: string;
  label: string;
};

/** 並び替えの短冊。つまんで上下に動かす */
function SortableItem({ id, label }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-2.5 py-1.5 bg-paper border border-rule-strong cursor-grab active:cursor-grabbing select-none"
      {...attributes}
      {...listeners}
    >
      <span className="text-muted-foreground text-sm">≡</span>
      <span className="font-hand">{label}</span>
    </div>
  );
}

// --------------- 問題 ---------------

// 選択肢の記号。選んだ記号を丸で囲む（答案用紙の書き方）
const CHOICE_SYMBOLS = ["ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ"];

/**
 * 赤ペンの採点の印。問題番号の左の欄に書き、文字にかけない
 * （実際の採点でも、印を文字にかけないよう指導されている。docs/design.md）
 */
function GradeMark({ isCorrect }: { isCorrect: boolean | null }) {
  if (isCorrect === null) return null;
  return isCorrect ? (
    <span aria-label="正解" className="block size-10 border-[2.5px] border-red-pen rounded-full -rotate-[8deg]" />
  ) : (
    <span aria-label="不正解" className="relative block size-10">
      <span className="absolute left-1/2 top-0.5 h-9 w-[2.5px] -ml-px bg-red-pen rounded rotate-40" />
      <span className="absolute left-1/2 top-0.5 h-9 w-[2.5px] -ml-px bg-red-pen rounded -rotate-40" />
    </span>
  );
}

/** 赤ペンの書き込み（解説・模範解答） */
function RedNote({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 pl-3 border-l-2 border-red-pen text-red-pen font-hand leading-relaxed">
      <span className="font-semibold mr-1.5">{label}</span>
      {children}
    </div>
  );
}

type QuestionCardProps = {
  question: QuizQuestion;
  index: number;
  answer: Answer;
  onAnswerChange: (answer: Answer) => void;
  state: QuizState;
};

function QuestionCard({ question, index, answer, onAnswerChange, state }: QuestionCardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const isSubmitted = state === "submitted";

  // 採点
  const isCorrect = useMemo(() => {
    if (!isSubmitted) return null;
    if (answer.type === "multiple_choice" && question.type === "multiple_choice") {
      if (answer.selectedIndex === null) return false;
      const correct = question.correct_answer as MultipleChoiceAnswer;
      const correctText = (question.options as string[])[correct.index];
      return answer.shuffledOptions[answer.selectedIndex] === correctText;
    }
    if (answer.type === "ordering" && question.type === "ordering") {
      const correct = question.correct_answer as string[];
      return JSON.stringify(answer.items) === JSON.stringify(correct);
    }
    return null; // short_answer は自己採点
  }, [isSubmitted, answer, question]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (answer.type !== "ordering") return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = answer.items.indexOf(String(active.id));
    const newIndex = answer.items.indexOf(String(over.id));
    onAnswerChange({ type: "ordering", items: arrayMove(answer.items, oldIndex, newIndex) });
  };

  return (
    <section className="grid grid-cols-[44px_32px_minmax(0,1fr)] gap-x-3 py-5 border-b border-rule last:border-b-0">
      <div className="pt-0.5">
        <GradeMark isCorrect={isCorrect} />
      </div>
      <span className="pt-1.5 font-hand font-semibold text-[17px] text-center">{index + 1}</span>
      <div className="min-w-0">
        <div className="quiz-question mb-2.5">
          <RichContent content={question.content as Record<string, unknown>} />
        </div>

        {/* 選択式：記号を丸で囲んで選ぶ。正解の選択肢には赤で「正解」と添える */}
        {question.type === "multiple_choice" && answer.type === "multiple_choice" && (
          <div role="radiogroup" className="grid gap-1">
            {answer.shuffledOptions.map((opt, i) => {
              const correctText = (question.options as string[])[(question.correct_answer as MultipleChoiceAnswer).index];
              const isSelected = answer.selectedIndex === i;
              const isCorrectChoice = isSubmitted && opt === correctText;

              return (
                <label
                  key={i}
                  className={`grid grid-cols-[34px_minmax(0,1fr)_auto] items-center px-2 py-1 rounded-sm font-hand ${
                    isSubmitted ? "" : "cursor-pointer hover:bg-surface"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${question.id}`}
                    checked={isSelected}
                    onChange={() =>
                      !isSubmitted &&
                      onAnswerChange({ type: "multiple_choice", selectedIndex: i, shuffledOptions: answer.shuffledOptions })
                    }
                    disabled={isSubmitted}
                    className="sr-only peer"
                  />
                  <span
                    className={`grid place-items-center size-7 rounded-full border-[1.5px] peer-focus-visible:outline peer-focus-visible:outline-2 ${
                      isSelected ? "border-ink" : "border-transparent"
                    }`}
                  >
                    {CHOICE_SYMBOLS[i] ?? i + 1}
                  </span>
                  <span>{opt}</span>
                  {isCorrectChoice && <span className="text-[13px] font-semibold text-red-pen">正解</span>}
                </label>
              );
            })}
          </div>
        )}

        {/* 記述式 */}
        {question.type === "short_answer" && answer.type === "short_answer" && (
          <div>
            <textarea
              value={answer.text}
              onChange={(e) =>
                !isSubmitted && onAnswerChange({ type: "short_answer", text: e.target.value })
              }
              disabled={isSubmitted}
              placeholder="答えを書く"
              rows={2}
              className="graph-paper w-full px-4 font-hand text-base leading-8 border border-rule-strong rounded-sm focus:outline-none focus:border-ink disabled:opacity-80 resize-none"
            />
            {isSubmitted && (
              <RedNote label="模範解答">
                {(question.correct_answer as ShortAnswerCorrect).text}
                <span className="block text-xs font-sans">記述の問題は、自分で見比べて確かめよう（採点はしない）</span>
              </RedNote>
            )}
          </div>
        )}

        {/* 並び替え：短冊を動かす */}
        {question.type === "ordering" && answer.type === "ordering" && (
          <div>
            {!isSubmitted ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={answer.items} strategy={verticalListSortingStrategy}>
                  <div className="grid gap-1.5">
                    {answer.items.map((item) => (
                      <SortableItem key={item} id={item} label={item} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <>
                <div className="grid gap-1.5">
                  {answer.items.map((item, i) => (
                    <div key={item} className="flex items-center gap-2 px-2.5 py-1.5 bg-paper border border-rule-strong font-hand">
                      <span className="w-4 text-sm text-muted-foreground">{i + 1}.</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                {isCorrect === false && (
                  <RedNote label="正しい順">{(question.correct_answer as string[]).join(" → ")}</RedNote>
                )}
              </>
            )}
          </div>
        )}

        {/* 解説（提出後に正解・不正解関係なく表示） */}
        {isSubmitted && question.explanation && (
          <RedNote label="解説">
            <div className="quiz-explanation">
              <RichContent content={question.explanation as Record<string, unknown>} />
            </div>
          </RedNote>
        )}
      </div>
    </section>
  );
}

// --------------- メインコンポーネント ---------------

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function initAnswer(question: QuizQuestion): Answer {
  if (question.type === "multiple_choice") {
    const shuffledOptions = shuffleArray(question.options as string[]);
    return { type: "multiple_choice", selectedIndex: null, shuffledOptions };
  }
  if (question.type === "short_answer") {
    return { type: "short_answer", text: "" };
  }
  // ordering: options をシャッフルして表示
  const items = shuffleArray(question.options as string[]);
  return { type: "ordering", items };
}

type RecentAttemptDetail = {
  score: number;
  max_score: number;
  quiz_attempt_answers: {
    is_correct: boolean | null;
    quiz_questions: { id: string; order: number };
  }[];
};

type Props = {
  quiz: QuizWithQuestions;
  /** このレッスン以外で要復習のレッスン数（提出後ナッジ用） */
  otherReviewCount?: number;
};

export default function QuizSection({ quiz, otherReviewCount = 0 }: Props) {
  const [answers, setAnswers] = useState<Answer[]>(() =>
    quiz.questions.map(initAnswer)
  );
  const [quizState, setQuizState] = useState<QuizState>("answering");
  const [submitting, setSubmitting] = useState(false);
  const [recentAttempts, setRecentAttempts] = useState<RecentAttemptDetail[]>([]);

  useEffect(() => {
    fetch(`/api/quizzes/${quiz.id}/attempts`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { data: RecentAttemptDetail[] | null } | null) => {
        if (json?.data) setRecentAttempts(json.data);
      })
      .catch(() => {});
  }, [quiz.id]);

  const recentStats = useMemo(() => {
    const autoGraded = recentAttempts.filter((a) => a.max_score > 0);
    if (autoGraded.length === 0) return null;
    const recent3 = autoGraded.slice(0, 3);
    const rates = recent3.map((a) => Math.round((a.score / a.max_score) * 100));
    return {
      max: Math.max(...rates),
      avg: Math.round(rates.reduce((s, r) => s + r, 0) / rates.length),
      count: recent3.length,
    };
  }, [recentAttempts]);

  const frequentlyMissed = useMemo(() => {
    const questionMap = new Map<string, { order: number; total: number; wrong: number }>();
    for (const attempt of recentAttempts) {
      for (const ans of attempt.quiz_attempt_answers) {
        if (ans.is_correct === null) continue;
        const key = ans.quiz_questions.id;
        const entry = questionMap.get(key) ?? { order: ans.quiz_questions.order, total: 0, wrong: 0 };
        entry.total++;
        if (!ans.is_correct) entry.wrong++;
        questionMap.set(key, entry);
      }
    }
    return [...questionMap.values()]
      .filter((s) => s.total >= 2 && s.wrong > s.total / 2)
      .sort((a, b) => a.order - b.order)
      .map((s) => `Q${s.order + 1}`);
  }, [recentAttempts]);

  const score = useMemo(() => {
    if (quizState !== "submitted") return null;
    let correct = 0;
    quiz.questions.forEach((q, i) => {
      const ans = answers[i];
      if (q.type === "multiple_choice" && ans.type === "multiple_choice") {
        if (ans.selectedIndex !== null) {
          const correctText = (q.options as string[])[(q.correct_answer as MultipleChoiceAnswer).index];
          if (ans.shuffledOptions[ans.selectedIndex] === correctText) correct++;
        }
      } else if (q.type === "ordering" && ans.type === "ordering") {
        if (JSON.stringify(ans.items) === JSON.stringify(q.correct_answer as string[])) correct++;
      }
      // short_answer は自己採点のためカウントしない
    });
    const autoGradable = quiz.questions.filter((q) => q.type !== "short_answer").length;
    return { correct, autoGradable };
  }, [quizState, answers, quiz.questions]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setQuizState("submitted");

    // 提出内容をAPIに送信して完了フラグを記録
    const payload = quiz.questions.map((q, i) => {
      const ans = answers[i];
      if (ans.type === "multiple_choice") {
        return {
          questionId: q.id,
          type: "multiple_choice" as const,
          selectedText: ans.selectedIndex !== null
            ? ans.shuffledOptions[ans.selectedIndex]
            : "",
        };
      }
      if (ans.type === "short_answer") {
        return { questionId: q.id, type: "short_answer" as const, text: ans.text };
      }
      return { questionId: q.id, type: "ordering" as const, items: ans.items };
    });

    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });

      if (res.ok) {
        const statsRes = await fetch(`/api/quizzes/${quiz.id}/attempts`);
        if (statsRes.ok) {
          const json = (await statsRes.json()) as { data: RecentAttemptDetail[] | null };
          if (json.data) setRecentAttempts(json.data);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers(quiz.questions.map(initAnswer));
    setQuizState("answering");
  };

  return (
    <div className="space-y-4">
      {/* これまでの記録（受験前・受験後ともに表示、初回は非表示） */}
      {(recentStats !== null || frequentlyMissed.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
          {recentStats && (
            <span>
              これまで：直近{recentStats.count}回の最高 <b className="text-ink">{recentStats.max}%</b>・平均{" "}
              <b className="text-ink">{recentStats.avg}%</b>
            </span>
          )}
          {frequentlyMissed.length > 0 && (
            <span>
              間違いが多い問題：<b className="text-red-pen">{frequentlyMissed.join("・")}</b>
            </span>
          )}
        </div>
      )}

      {/* 答案用紙 */}
      <div className="bg-sheet border border-rule-strong px-7 pb-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] -mx-7 mb-2 border-b-2 border-ink">
          <div className="px-7 py-2.5">
            <span className="block text-[11px] text-muted-foreground">小テスト</span>
            <span className="font-hand font-semibold text-lg">{quiz.title}</span>
          </div>
          <div className="min-w-[120px] px-4 py-2.5 text-center border-l border-rule-strong">
            <span className="block text-[11px] text-muted-foreground">得点</span>
            {quizState === "submitted" && score !== null && score.autoGradable > 0 ? (
              // 得点は赤ペンで書くだけで、丸で囲まない（点数を目立たせない）
              <span className="font-hand font-semibold text-2xl text-red-pen">
                {score.correct} / {score.autoGradable}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">{quiz.questions.length} 問</span>
            )}
          </div>
        </div>

        {quiz.questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={i}
            answer={answers[i]}
            onAnswerChange={(ans) => {
              setAnswers((prev) => prev.map((a, idx) => (idx === i ? ans : a)));
            }}
            state={quizState}
          />
        ))}

        <div className="flex flex-wrap items-center gap-3 mt-5">
          {quizState === "answering" ? (
            <>
              <SubmitButton
                loading={submitting}
                loadingLabel="送信中..."
                onClick={handleSubmit}
                className="px-5 py-2 text-sm rounded-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                答え合わせ
              </SubmitButton>
              <span className="text-xs text-muted-foreground">答え合わせのあとも、何度でも解き直せます</span>
            </>
          ) : (
            <>
              <button
                onClick={handleRetry}
                className="px-5 py-2 text-sm rounded-sm border border-ink hover:bg-surface transition-colors"
              >
                もう一度解く
              </button>
              <span className="text-xs text-muted-foreground">間違えたところはノートを見直してから解き直そう</span>
            </>
          )}
        </div>
        {quizState === "submitted" && otherReviewCount > 0 && (
          <Link href="/quiz-results" className="inline-block mt-3 text-sm text-red-pen underline underline-offset-2">
            ほかに見直したいレッスンが {otherReviewCount} 件あります（小テスト結果で確認）
          </Link>
        )}
      </div>
    </div>
  );
}
