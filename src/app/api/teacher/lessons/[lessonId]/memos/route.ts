import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { parseGradeClassParams } from "@/lib/api/params";
import { getLessonMemosByClass } from "@/lib/db/memos";

type Params = { params: Promise<{ lessonId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { lessonId } = await params;
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  // レッスン別分析は1クラス単位のみ（学年全体は扱わない）
  const parsed = parseGradeClassParams(req.nextUrl.searchParams);
  if (parsed.errorResponse) return parsed.errorResponse;
  const { grade, classNum } = parsed.params;

  const students = await getLessonMemosByClass(lessonId, grade, classNum);
  return NextResponse.json({ data: students, error: null });
}
