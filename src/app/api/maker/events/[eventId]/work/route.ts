import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { saveMakerWork } from "@/lib/db/maker";

type Params = { params: Promise<{ eventId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const body = (await req.json()) as {
    plan?: unknown;
    title?: unknown;
    description?: unknown;
    code?: unknown;
  };
  if (
    typeof body.plan !== "string" ||
    typeof body.title !== "string" ||
    typeof body.description !== "string" ||
    typeof body.code !== "string"
  ) {
    return NextResponse.json({ data: null, error: "Invalid request" }, { status: 400 });
  }

  const ok = await saveMakerWork(eventId, user.id, {
    plan: body.plan,
    title: body.title,
    description: body.description,
    code: body.code,
  });
  if (!ok) {
    return NextResponse.json(
      { data: null, error: "保存できませんでした。文字数が多すぎるか、受付が終了しています" },
      { status: 500 }
    );
  }
  return NextResponse.json({ data: { eventId }, error: null });
}
