import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { addQuizQuestion } from "@/lib/db/quizzes";
import type { QuizQuestionType } from "@/lib/db/quizzes";

type Params = { params: Promise<{ quizId: string }> };

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

export async function POST(req: NextRequest, { params }: Params) {
  const { quizId } = await params;

  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const body = (await req.json()) as QuestionPayload;

  const question = await addQuizQuestion(quizId, {
    type: body.type,
    content: body.content,
    explanation: body.explanation,
    options: body.options,
    correctAnswer: body.correctAnswer,
  });

  if (!question) {
    return NextResponse.json({ data: null, error: "Failed to add question" }, { status: 500 });
  }

  return NextResponse.json({ data: question, error: null }, { status: 201 });
}
