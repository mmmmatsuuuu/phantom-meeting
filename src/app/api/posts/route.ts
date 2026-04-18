import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getPostsByLessonId,
  getPostsWithAuthorsByLessonId,
  createPost,
  existsPostByMemoId,
} from "@/lib/db/posts";
import type { TiptapContent } from "@/lib/db/memos";

export async function GET(request: NextRequest) {
  const lessonId = request.nextUrl.searchParams.get("lessonId");
  if (!lessonId) {
    return NextResponse.json({ data: null, error: "lessonId is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "teacher" || profile?.role === "admin") {
      const data = await getPostsWithAuthorsByLessonId(lessonId);
      return NextResponse.json({ data, error: null });
    }
  }

  const data = await getPostsByLessonId(lessonId);
  return NextResponse.json({ data, error: null });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    memoId: string;
    lessonId: string;
    content: TiptapContent;
    timestampSeconds: number | null;
  };

  if (!body.memoId || !body.lessonId || !body.content) {
    return NextResponse.json(
      { data: null, error: "memoId, lessonId and content are required" },
      { status: 400 }
    );
  }

  const alreadyExists = await existsPostByMemoId(body.memoId);
  if (alreadyExists) {
    return NextResponse.json({ data: null, error: "already_posted" }, { status: 409 });
  }

  const data = await createPost({
    memoId: body.memoId,
    lessonId: body.lessonId,
    content: body.content,
    timestampSeconds: body.timestampSeconds ?? null,
  });

  if (!data) {
    return NextResponse.json({ data: null, error: "Failed to create post" }, { status: 500 });
  }

  return NextResponse.json({ data, error: null }, { status: 201 });
}
