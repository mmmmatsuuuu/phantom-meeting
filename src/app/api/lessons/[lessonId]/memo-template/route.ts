import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { deleteMemoTemplate, saveMemoTemplate } from "@/lib/db/memo-templates";
import { isTiptapDoc } from "@/lib/tiptap-utils";

type Params = { params: Promise<{ lessonId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { lessonId } = await params;

  const { user, errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const body = (await req.json()) as { content?: unknown };
  if (!isTiptapDoc(body.content)) {
    return NextResponse.json(
      { data: null, error: "content must be a tiptap document" },
      { status: 400 }
    );
  }

  const ok = await saveMemoTemplate(lessonId, body.content, user.id);
  if (!ok) {
    return NextResponse.json({ data: null, error: "Failed to save template" }, { status: 500 });
  }
  return NextResponse.json({ data: { lessonId }, error: null });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { lessonId } = await params;

  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const ok = await deleteMemoTemplate(lessonId);
  if (!ok) {
    return NextResponse.json({ data: null, error: "Failed to delete template" }, { status: 500 });
  }
  return NextResponse.json({ data: { lessonId }, error: null });
}
