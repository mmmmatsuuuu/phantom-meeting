import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { saveStudentCodeState } from "@/lib/db/code-snippets";

type Params = { params: Promise<{ snippetId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { snippetId } = await params;

  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const body = (await req.json()) as { code?: string };
  if (typeof body.code !== "string") {
    return NextResponse.json({ data: null, error: "code is required" }, { status: 400 });
  }

  const ok = await saveStudentCodeState(snippetId, user.id, body.code);
  if (!ok) {
    return NextResponse.json(
      { data: null, error: "Failed to save code" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { snippetId }, error: null });
}
