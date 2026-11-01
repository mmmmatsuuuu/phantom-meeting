import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { submitMakerWork } from "@/lib/db/maker";

type Params = { params: Promise<{ eventId: string }> };

const ERRORS = {
  event_not_open: { status: 409, message: "この課題の提出は受け付けていません" },
  student_number_required: {
    status: 400,
    message: "提出する前に、プロフィールで学籍番号を設定してください",
  },
  work_incomplete: { status: 400, message: "作品名・説明・コードをすべて入力してください" },
  failed: { status: 500, message: "提出に失敗しました。もう一度お試しください" },
} as const;

export async function POST(_req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const { errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const result = await submitMakerWork(eventId);
  if (result !== "ok") {
    const { status, message } = ERRORS[result];
    return NextResponse.json({ data: null, error: message }, { status });
  }
  return NextResponse.json({ data: { eventId }, error: null });
}
