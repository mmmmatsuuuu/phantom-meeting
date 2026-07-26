import { NextResponse, type NextRequest } from "next/server";
import { deleteLesson } from "@/lib/db/contents";
import { setLessonPlaygroundEnabled } from "@/lib/db/code-snippets";
import { requireTeacher } from "@/lib/api/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const { lessonId } = await params;
  const body = (await request.json()) as { enablePlayground?: boolean };
  if (typeof body.enablePlayground !== "boolean") {
    return NextResponse.json(
      { data: null, error: "enablePlayground is required" },
      { status: 400 }
    );
  }

  const ok = await setLessonPlaygroundEnabled(lessonId, body.enablePlayground);
  if (!ok) {
    return NextResponse.json(
      { data: null, error: "Failed to update lesson" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { id: lessonId }, error: null });
}

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
