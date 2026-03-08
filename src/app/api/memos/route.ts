import { NextResponse, type NextRequest } from "next/server";
import { getMemosByLessonId, createMemo } from "@/lib/db/memos";
import type { TiptapContent } from "@/lib/db/memos";

export async function GET(request: NextRequest) {
  const lessonId = request.nextUrl.searchParams.get("lessonId");
  if (!lessonId) {
    return NextResponse.json({ data: null, error: "lessonId is required" }, { status: 400 });
  }

  const data = await getMemosByLessonId(lessonId);
  return NextResponse.json({ data, error: null });
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    lessonId: string;
    content: TiptapContent;
    timestampSeconds: number | null;
  };

  if (!body.lessonId || !body.content) {
    return NextResponse.json({ data: null, error: "lessonId and content are required" }, { status: 400 });
  }

  const data = await createMemo({
    lessonId: body.lessonId,
    content: body.content,
    timestampSeconds: body.timestampSeconds ?? null,
  });

  if (!data) {
    return NextResponse.json({ data: null, error: "Failed to create memo" }, { status: 500 });
  }

  return NextResponse.json({ data, error: null }, { status: 201 });
}
