import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { getMakerSubmissionCode } from "@/lib/db/maker";

type Params = { params: Promise<{ eventId: string; userId: string }> };

// 閲覧できるかどうかは RLS で判定する（未開放のクラス・公開停止中は null になる）
export async function GET(_req: NextRequest, { params }: Params) {
  const { eventId, userId } = await params;
  const { errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const code = await getMakerSubmissionCode(eventId, userId);
  if (code === null) {
    return NextResponse.json({ data: null, error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data: { code }, error: null });
}
