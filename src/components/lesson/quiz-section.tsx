"use client";

import { useState, useMemo } from "react";
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
import RichContent from "@/components/shared/rich-content";
import type { QuizWithQuestions, QuizQuestion } from "@/lib/db/quizzes";

// --------------- 型 ---------------

type MultipleChoiceAnswer = { index: number };
type ShortAnswerCorrect = { text: string };

type Answer =
  | { type: "multiple_choice"; selectedIndex: number | null }
  | { type: "short_answer"; text: string }
  | { type: "ordering"; items: string[] };

type QuizState = "answering" | "submitted";

// --------------- 並び替えアイテム ---------------

type SortableItemProps = {
  id: string;
  label: string;
};

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
      className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background cursor-grab active:cursor-grabbing select-none"
      {...attributes}
      {...listeners}
    >
      <span className="text-muted-foreground text-sm">⠿</span>
      <span className="text-sm">{label}</span>
    </div>
  );
}

// --------------- 問題カード ---------------

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
      const correct = question.correct_answer as MultipleChoiceAnswer;
      return answer.selectedIndex === correct.index;
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
    <div
      className={`border rounded-lg p-4 space-y-3 ${
        isSubmitted && isCorrect === true
          ? "border-green-500 bg-green-50 dark:bg-green-950/20"
          : isSubmitted && isCorrect === false
          ? "border-red-500 bg-red-50 dark:bg-red-950/20"
          : "bg-card"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="text-sm font-semibold shrink-0">Q{index + 1}.</span>
        <div className="flex-1">
          <RichContent content={question.content as Record<string, unknown>} />
        </div>
        {isSubmitted && isCorrect === true && (
          <span className="text-green-600 font-bold shrink-0">○</span>
        )}
        {isSubmitted && isCorrect === false && (
          <span className="text-red-600 font-bold shrink-0">✕</span>
        )}
      </div>

      {/* 選択式 */}
      {question.type === "multiple_choice" && answer.type === "multiple_choice" && (
        <div className="space-y-1.5 pl-5">
          {(question.options as string[]).map((opt, i) => {
            const correct = (question.correct_answer as MultipleChoiceAnswer).index;
            const isSelected = answer.selectedIndex === i;
            const isCorrectChoice = isSubmitted && i === correct;
            const isWrong = isSubmitted && isSelected && i !== correct;

            return (
              <label
                key={i}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                  isCorrectChoice
                    ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                    : isWrong
                    ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                    : isSelected
                    ? "bg-primary/10"
                    : "hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  checked={isSelected}
                  onChange={() =>
                    !isSubmitted &&
                    onAnswerChange({ type: "multiple_choice", selectedIndex: i })
                  }
                  disabled={isSubmitted}
                  className="shrink-0"
                />
                <span className="text-sm">{opt}</span>
                {isCorrectChoice && (
                  <span className="ml-auto text-xs text-green-600 font-medium">正解</span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {/* 記述式 */}
      {question.type === "short_answer" && answer.type === "short_answer" && (
        <div className="pl-5 space-y-2">
          <textarea
            value={answer.text}
            onChange={(e) =>
              !isSubmitted && onAnswerChange({ type: "short_answer", text: e.target.value })
            }
            disabled={isSubmitted}
            placeholder="回答を入力..."
            rows={3}
            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-70 resize-none"
          />
          {isSubmitted && (
            <div className="text-sm p-3 rounded-md bg-muted">
              <span className="font-medium">模範解答: </span>
              {(question.correct_answer as ShortAnswerCorrect).text}
            </div>
          )}
        </div>
      )}

      {/* 並び替え */}
      {question.type === "ordering" && answer.type === "ordering" && (
        <div className="pl-5 space-y-2">
          {!isSubmitted ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={answer.items}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {answer.items.map((item) => (
                    <SortableItem key={item} id={item} label={item} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-1.5">
              {answer.items.map((item, i) => {
                const correct = question.correct_answer as string[];
                const isItemCorrect = correct[i] === item;
                return (
                  <div
                    key={item}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${
                      isItemCorrect
                        ? "bg-green-50 border-green-300 dark:bg-green-900/20"
                        : "bg-red-50 border-red-300 dark:bg-red-900/20"
                    }`}
                  >
                    <span className="text-muted-foreground w-4">{i + 1}.</span>
                    <span className="flex-1">{item}</span>
                    {!isItemCorrect && (
                      <span className="text-xs text-muted-foreground">
                        → {correct[i]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
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
    return { type: "multiple_choice", selectedIndex: null };
  }
  if (question.type === "short_answer") {
    return { type: "short_answer", text: "" };
  }
  // ordering: options をシャッフルして表示
  const items = shuffleArray(question.options as string[]);
  return { type: "ordering", items };
}

type Props = {
  quiz: QuizWithQuestions;
};

export default function QuizSection({ quiz }: Props) {
  const [answers, setAnswers] = useState<Answer[]>(() =>
    quiz.questions.map(initAnswer)
  );
  const [quizState, setQuizState] = useState<QuizState>("answering");

  const score = useMemo(() => {
    if (quizState !== "submitted") return null;
    let correct = 0;
    quiz.questions.forEach((q, i) => {
      const ans = answers[i];
      if (q.type === "multiple_choice" && ans.type === "multiple_choice") {
        if (ans.selectedIndex === (q.correct_answer as MultipleChoiceAnswer).index) correct++;
      } else if (q.type === "ordering" && ans.type === "ordering") {
        if (JSON.stringify(ans.items) === JSON.stringify(q.correct_answer as string[])) correct++;
      }
      // short_answer は自己採点のためカウントしない
    });
    const autoGradable = quiz.questions.filter((q) => q.type !== "short_answer").length;
    return { correct, autoGradable };
  }, [quizState, answers, quiz.questions]);

  const handleSubmit = () => {
    setQuizState("submitted");
  };

  const handleRetry = () => {
    setAnswers(quiz.questions.map(initAnswer));
    setQuizState("answering");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{quiz.title}</h2>
        <span className="text-sm text-muted-foreground">{quiz.questions.length} 問</span>
      </div>

      {quizState === "submitted" && score !== null && (
        <div className="rounded-lg border bg-card p-4 text-center space-y-1">
          {score.autoGradable > 0 && (
            <p className="text-2xl font-bold">
              {score.correct} / {score.autoGradable}
              <span className="text-base font-normal text-muted-foreground ml-1">点</span>
            </p>
          )}
          {quiz.questions.some((q) => q.type === "short_answer") && (
            <p className="text-sm text-muted-foreground">記述式は模範解答を参考に自己採点してください</p>
          )}
        </div>
      )}

      <div className="space-y-4">
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
      </div>

      {quizState === "answering" ? (
        <button
          onClick={handleSubmit}
          className="w-full py-2.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          回答を提出する
        </button>
      ) : (
        <button
          onClick={handleRetry}
          className="w-full py-2.5 text-sm rounded-md border hover:bg-muted transition-colors"
        >
          もう一度挑戦する
        </button>
      )}
    </div>
  );
}
