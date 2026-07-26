import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { updateCodeSnippet, deleteCodeSnippet } from "@/lib/db/code-snippets";
import type { CodeLanguage } from "@/lib/db/code-snippets";

type Params = { params: Promise<{ snippetId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { snippetId } = await params;

  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const body = (await req.json()) as {
    title?: string;
    language?: CodeLanguage;
    initialCode?: string;
  };

  const ok = await updateCodeSnippet(snippetId, {
    title: body.title,
    language: body.language,
    initialCode: body.initialCode,
  });

  if (!ok) {
    return NextResponse.json(
      { data: null, error: "Failed to update code snippet" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { id: snippetId }, error: null });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { snippetId } = await params;

  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const ok = await deleteCodeSnippet(snippetId);
  if (!ok) {
    return NextResponse.json(
      { data: null, error: "Failed to delete code snippet" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { id: snippetId }, error: null });
}
