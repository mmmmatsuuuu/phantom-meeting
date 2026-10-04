import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { getUnitReviewData } from "@/lib/db/review";

type Params = { params: Promise<{ unitId: string }> };

/** AI 振り返りプロンプト用の、ログインユーザー本人の1単元分の学習データ */
export async function GET(_req: NextRequest, { params }: Params) {
  const { unitId } = await params;
  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const data = await getUnitReviewData(unitId, user.id);
  if (!data) {
    return NextResponse.json({ data: null, error: "単元が見つかりません" }, { status: 404 });
  }
  return NextResponse.json({ data, error: null });
}
