import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { deleteQuizQuestion } from "@/lib/db/quizzes";

type Params = { params: Promise<{ questionId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { questionId } = await params;

  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const ok = await deleteQuizQuestion(questionId);
  if (!ok) {
    return NextResponse.json({ data: null, error: "Failed to delete question" }, { status: 500 });
  }

  return NextResponse.json({ data: { id: questionId }, error: null });
}
