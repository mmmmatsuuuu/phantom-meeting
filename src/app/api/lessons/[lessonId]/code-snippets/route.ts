import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { addCodeSnippet } from "@/lib/db/code-snippets";
import type { CodeLanguage } from "@/lib/db/code-snippets";

type Params = { params: Promise<{ lessonId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { lessonId } = await params;

  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const body = (await req.json()) as {
    title: string;
    language: CodeLanguage;
    initialCode: string;
  };

  if (!body.title?.trim() || !body.language || body.initialCode === undefined) {
    return NextResponse.json(
      { data: null, error: "title, language and initialCode are required" },
      { status: 400 }
    );
  }

  const snippet = await addCodeSnippet(lessonId, {
    title: body.title.trim(),
    language: body.language,
    initialCode: body.initialCode,
  });

  if (!snippet) {
    return NextResponse.json(
      { data: null, error: "Failed to add code snippet" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: snippet, error: null }, { status: 201 });
}
