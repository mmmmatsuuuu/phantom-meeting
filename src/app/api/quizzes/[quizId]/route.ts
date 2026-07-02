import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { deleteQuiz } from "@/lib/db/quizzes";

type Params = { params: Promise<{ quizId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { quizId } = await params;

  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const ok = await deleteQuiz(quizId);
  if (!ok) {
    return NextResponse.json({ data: null, error: "Failed to delete quiz" }, { status: 500 });
  }

  return NextResponse.json({ data: { id: quizId }, error: null });
}
