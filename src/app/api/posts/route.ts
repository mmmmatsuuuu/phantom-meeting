import { NextResponse, type NextRequest } from "next/server";
import { getPostsByLessonId, createPost } from "@/lib/db/posts";
import type { TiptapContent } from "@/lib/db/memos";

export async function GET(request: NextRequest) {
  const lessonId = request.nextUrl.searchParams.get("lessonId");
  if (!lessonId) {
    return NextResponse.json({ data: null, error: "lessonId is required" }, { status: 400 });
  }

  const data = await getPostsByLessonId(lessonId);
  return NextResponse.json({ data, error: null });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    memoId: string;
    lessonId: string;
    content: TiptapContent;
  };

  if (!body.memoId || !body.lessonId || !body.content) {
    return NextResponse.json(
      { data: null, error: "memoId, lessonId and content are required" },
      { status: 400 }
    );
  }

  const data = await createPost({
    memoId: body.memoId,
    lessonId: body.lessonId,
    content: body.content,
  });

  if (!data) {
    return NextResponse.json({ data: null, error: "Failed to create post" }, { status: 500 });
  }

  return NextResponse.json({ data, error: null }, { status: 201 });
}
