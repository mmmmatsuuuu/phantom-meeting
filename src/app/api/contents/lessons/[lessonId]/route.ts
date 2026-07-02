import { NextResponse, type NextRequest } from "next/server";
import { deleteLesson } from "@/lib/db/contents";
import { requireTeacher } from "@/lib/api/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const { lessonId } = await params;
  const ok = await deleteLesson(lessonId);
  if (!ok) {
    return NextResponse.json(
      { data: null, error: "Failed to delete lesson" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { id: lessonId }, error: null });
}
