import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { getQuizAnalytics } from "@/lib/db/quizzes";

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const { searchParams } = req.nextUrl;
  const subjectId = searchParams.get("subjectId");
  const gradeRaw = searchParams.get("grade");
  const classRaw = searchParams.get("class");

  if (!subjectId || !gradeRaw) {
    return NextResponse.json(
      { data: null, error: "subjectId と grade は必須です" },
      { status: 400 }
    );
  }

  const grade = parseInt(gradeRaw, 10);
  if (isNaN(grade)) {
    return NextResponse.json({ data: null, error: "grade が不正です" }, { status: 400 });
  }

  let classNum: number | "all";
  if (!classRaw || classRaw === "all") {
    classNum = "all";
  } else {
    const parsed = parseInt(classRaw, 10);
    if (isNaN(parsed)) {
      return NextResponse.json({ data: null, error: "class が不正です" }, { status: 400 });
    }
    classNum = parsed;
  }

  const data = await getQuizAnalytics(subjectId, grade, classNum);
  return NextResponse.json({ data, error: null });
}
