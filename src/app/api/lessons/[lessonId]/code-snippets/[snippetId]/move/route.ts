import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { moveCodeSnippet } from "@/lib/db/code-snippets";

type Params = { params: Promise<{ lessonId: string; snippetId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { lessonId, snippetId } = await params;

  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const body = (await req.json()) as { direction: "up" | "down" };
  if (body.direction !== "up" && body.direction !== "down") {
    return NextResponse.json(
      { data: null, error: "direction must be 'up' or 'down'" },
      { status: 400 }
    );
  }

  const ok = await moveCodeSnippet(lessonId, snippetId, body.direction);
  if (!ok) {
    return NextResponse.json(
      { data: null, error: "Failed to move code snippet" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { id: snippetId }, error: null });
}
