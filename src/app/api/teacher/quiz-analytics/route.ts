import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { parseGradeClassOrAllParams } from "@/lib/api/params";
import { getQuizAnalytics } from "@/lib/db/quizzes";

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const { searchParams } = req.nextUrl;
  const subjectId = searchParams.get("subjectId");
  if (!subjectId) {
    return NextResponse.json({ data: null, error: "subjectId は必須です" }, { status: 400 });
  }

  const parsed = parseGradeClassOrAllParams(searchParams);
  if (parsed.errorResponse) return parsed.errorResponse;
  const { grade, classNum } = parsed.params;

  const data = await getQuizAnalytics(subjectId, grade, classNum);
  return NextResponse.json({ data, error: null });
}
