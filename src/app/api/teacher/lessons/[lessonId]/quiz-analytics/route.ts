import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { getLessonQuizResultsByStudent } from "@/lib/db/quizzes";

type Params = { params: Promise<{ lessonId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { lessonId } = await params;
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const { searchParams } = req.nextUrl;
  const gradeRaw = searchParams.get("grade");
  const classRaw = searchParams.get("class");

  // レッスン別分析は1クラス単位のみ（学年全体は扱わない）
  if (!gradeRaw || !classRaw) {
    return NextResponse.json(
      { data: null, error: "grade と class は必須です" },
      { status: 400 }
    );
  }

  const grade = parseInt(gradeRaw, 10);
  if (isNaN(grade)) {
    return NextResponse.json({ data: null, error: "grade が不正です" }, { status: 400 });
  }

  const classNum = parseInt(classRaw, 10);
  if (isNaN(classNum)) {
    return NextResponse.json({ data: null, error: "class が不正です" }, { status: 400 });
  }

  const data = await getLessonQuizResultsByStudent(lessonId, grade, classNum);
  if (!data) {
    return NextResponse.json(
      { data: null, error: "レッスンが見つかりません" },
      { status: 404 }
    );
  }
  return NextResponse.json({ data, error: null });
}
