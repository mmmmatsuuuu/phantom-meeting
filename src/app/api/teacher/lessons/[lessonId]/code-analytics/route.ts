import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { parseGradeClassParams } from "@/lib/api/params";
import { getLessonCodeStatesByStudent } from "@/lib/db/code-snippets";

type Params = { params: Promise<{ lessonId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { lessonId } = await params;
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  // レッスン別分析は1クラス単位のみ（学年全体は扱わない）
  const parsed = parseGradeClassParams(req.nextUrl.searchParams);
  if (parsed.errorResponse) return parsed.errorResponse;
  const { grade, classNum } = parsed.params;

  const data = await getLessonCodeStatesByStudent(lessonId, grade, classNum);
  if (!data) {
    return NextResponse.json(
      { data: null, error: "レッスンが見つかりません" },
      { status: 404 }
    );
  }
  return NextResponse.json({ data, error: null });
}
