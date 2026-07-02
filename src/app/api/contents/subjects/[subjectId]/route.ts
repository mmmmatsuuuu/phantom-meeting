import { NextResponse, type NextRequest } from "next/server";
import { updateSubject, deleteSubject } from "@/lib/db/contents";
import { requireTeacher } from "@/lib/api/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const { subjectId } = await params;
  const body = (await request.json()) as { name: string };
  if (!body.name?.trim()) {
    return NextResponse.json(
      { data: null, error: "name is required" },
      { status: 400 }
    );
  }

  const ok = await updateSubject(subjectId, body.name.trim());
  if (!ok) {
    return NextResponse.json(
      { data: null, error: "Failed to update subject" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { id: subjectId }, error: null });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const { subjectId } = await params;
  const ok = await deleteSubject(subjectId);
  if (!ok) {
    return NextResponse.json(
      { data: null, error: "Failed to delete subject" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { id: subjectId }, error: null });
}
