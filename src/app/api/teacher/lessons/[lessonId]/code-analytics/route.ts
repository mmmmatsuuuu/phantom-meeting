import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { getLessonCodeStatesByStudent } from "@/lib/db/code-snippets";

type Params = { params: Promise<{ lessonId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { lessonId } = await params;
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const { searchParams } = req.nextUrl;
  const gradeRaw = searchParams.get("grade");
  const classRaw = searchParams.get("class");

  if (!gradeRaw) {
    return NextResponse.json(
      { data: null, error: "grade は必須です" },
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

  const data = await getLessonCodeStatesByStudent(lessonId, grade, classNum);
  if (!data) {
    return NextResponse.json(
      { data: null, error: "レッスンが見つかりません" },
      { status: 404 }
    );
  }
  return NextResponse.json({ data, error: null });
}
