import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createQuizAttempt, hasCompletedQuiz } from "@/lib/db/quizzes";
import type { QuizQuestion } from "@/lib/db/quizzes";

type AnswerPayload =
  | { questionId: string; type: "multiple_choice"; selectedText: string }
  | { questionId: string; type: "short_answer"; text: string }
  | { questionId: string; type: "ordering"; items: string[] };

type Params = { params: Promise<{ quizId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { quizId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });

  const completed = await hasCompletedQuiz(quizId, user.id);
  return NextResponse.json({ data: { completed }, error: null });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { quizId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { answers: AnswerPayload[] };
  if (!Array.isArray(body.answers)) {
    return NextResponse.json({ data: null, error: "Invalid payload" }, { status: 400 });
  }

  // クイズと問題を取得してサーバーサイドで採点
  const { data: questions, error: qErr } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order");

  if (qErr || !questions) {
    return NextResponse.json({ data: null, error: "Quiz not found" }, { status: 404 });
  }

  let score = 0;
  let maxScore = 0;

  for (const q of questions as QuizQuestion[]) {
    if (q.type === "short_answer") continue;
    maxScore++;

    const answer = body.answers.find((a) => a.questionId === q.id);
    if (!answer) continue;

    if (q.type === "multiple_choice" && answer.type === "multiple_choice") {
      const correctIndex = (q.correct_answer as { index: number }).index;
      const correctText = (q.options as string[])[correctIndex];
      if (answer.selectedText === correctText) score++;
    } else if (q.type === "ordering" && answer.type === "ordering") {
      if (JSON.stringify(answer.items) === JSON.stringify(q.correct_answer as string[])) score++;
    }
  }

  const ok = await createQuizAttempt({ quizId, userId: user.id, score, maxScore });
  if (!ok) {
    return NextResponse.json({ data: null, error: "Failed to save attempt" }, { status: 500 });
  }

  return NextResponse.json({ data: { score, maxScore }, error: null }, { status: 201 });
}
