import { NextResponse, type NextRequest } from "next/server";
import { deleteLesson, updateLesson } from "@/lib/db/contents";
import { extractYouTubeVideoId } from "@/lib/utils";
import { setLessonPlaygroundEnabled } from "@/lib/db/code-snippets";
import { requireTeacher } from "@/lib/api/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const { lessonId } = await params;
  // プレイグラウンドの切り替え（コード管理画面）と、タイトル・URL の編集（レッスン編集画面）の 2 通り
  const body = (await request.json()) as {
    enablePlayground?: boolean;
    title?: string;
    youtubeUrl?: string;
  };

  let ok: boolean;
  if (typeof body.enablePlayground === "boolean") {
    ok = await setLessonPlaygroundEnabled(lessonId, body.enablePlayground);
  } else if (typeof body.title === "string" && typeof body.youtubeUrl === "string") {
    const title = body.title.trim();
    const youtubeUrl = body.youtubeUrl.trim();
    if (!title || !extractYouTubeVideoId(youtubeUrl)) {
      return NextResponse.json(
        { data: null, error: "title and a valid youtubeUrl are required" },
        { status: 400 }
      );
    }
    ok = await updateLesson(lessonId, { title, youtubeUrl });
  } else {
    return NextResponse.json(
      { data: null, error: "enablePlayground, or title and youtubeUrl are required" },
      { status: 400 }
    );
  }

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
