import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { createQuiz } from "@/lib/db/quizzes";
import type { CreateQuizQuestionInput, QuizQuestionType } from "@/lib/db/quizzes";

type QuestionPayload = {
  type: QuizQuestionType;
  content: Record<string, unknown>;
  explanation: Record<string, unknown> | null;
  options: string[] | null;
  correctAnswer:
    | { index: number }
    | { text: string }
    | string[];
};

type CreateQuizPayload = {
  lessonId: string;
  title: string;
  questions: QuestionPayload[];
};

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const body = (await req.json()) as CreateQuizPayload;
  const { lessonId, title, questions } = body;

  if (!lessonId || !title || !Array.isArray(questions)) {
    return NextResponse.json({ data: null, error: "Invalid payload" }, { status: 400 });
  }

  const inputs: CreateQuizQuestionInput[] = questions.map((q, i) => ({
    type: q.type,
    content: q.content,
    explanation: q.explanation,
    options: q.options,
    correctAnswer: q.correctAnswer,
    order: i,
  }));

  const quiz = await createQuiz({ lessonId, title, questions: inputs });
  if (!quiz) {
    return NextResponse.json({ data: null, error: "Failed to create quiz" }, { status: 500 });
  }

  return NextResponse.json({ data: quiz, error: null }, { status: 201 });
}
