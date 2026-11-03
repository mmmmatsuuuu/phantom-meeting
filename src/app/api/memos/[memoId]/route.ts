import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { deleteMemo, getMemoLessonId, updateMemo } from "@/lib/db/memos";
import type { TiptapContent } from "@/lib/db/memos";
import { validateMemoContent } from "@/lib/db/memo-templates";

type Params = { params: Promise<{ memoId: string }> };

// 保存したノートを開き直して、続きを書けるようにする（自分のノートだけ。RLS で判定）
export async function PUT(request: NextRequest, { params }: Params) {
  const { memoId } = await params;

  const { errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const body = (await request.json()) as { content?: TiptapContent };
  if (!body.content) {
    return NextResponse.json({ data: null, error: "content is required" }, { status: 400 });
  }

  const lessonId = await getMemoLessonId(memoId);
  if (!lessonId) {
    return NextResponse.json({ data: null, error: "Memo not found" }, { status: 404 });
  }

  const invalid = await validateMemoContent(lessonId, body.content);
  if (invalid) {
    return NextResponse.json({ data: null, error: invalid }, { status: 400 });
  }

  // 他人のメモ（教師は閲覧だけできる）は RLS で更新されず、行が返らない
  const data = await updateMemo(memoId, body.content);
  if (!data) {
    return NextResponse.json({ data: null, error: "Memo not found" }, { status: 404 });
  }
  return NextResponse.json({ data, error: null });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { memoId } = await params;

  const { errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const success = await deleteMemo(memoId);
  if (!success) {
    return NextResponse.json({ data: null, error: "Failed to delete memo" }, { status: 500 });
  }

  return NextResponse.json({ data: { id: memoId }, error: null });
}
