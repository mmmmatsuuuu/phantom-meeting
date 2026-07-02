import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { getStudentsWithMemoCounts } from "@/lib/db/memos";

type Params = { params: Promise<{ lessonId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { lessonId } = await params;
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const { searchParams } = req.nextUrl;
  const gradeRaw = searchParams.get("grade");
  const classRaw = searchParams.get("class");
  const grade = gradeRaw !== null ? parseInt(gradeRaw, 10) : null;
  const classNum = classRaw !== null ? parseInt(classRaw, 10) : null;

  if (grade === null && classNum === null) {
    return NextResponse.json(
      { data: null, error: "grade または class のどちらかは必須です" },
      { status: 400 }
    );
  }
  if (grade !== null && isNaN(grade)) {
    return NextResponse.json({ data: null, error: "grade is invalid" }, { status: 400 });
  }
  if (classNum !== null && isNaN(classNum)) {
    return NextResponse.json({ data: null, error: "class is invalid" }, { status: 400 });
  }

  const students = await getStudentsWithMemoCounts(lessonId, grade, classNum);
  return NextResponse.json({ data: students, error: null });
}
