import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { getMemosByStudent } from "@/lib/db/memos";

type Params = { params: Promise<{ lessonId: string; userId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { lessonId, userId } = await params;
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const memos = await getMemosByStudent(lessonId, userId);
  return NextResponse.json({ data: memos, error: null });
}
