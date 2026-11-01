import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { getMakerStudentDetail } from "@/lib/db/maker";

type Params = { params: Promise<{ eventId: string; userId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { eventId, userId } = await params;
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const detail = await getMakerStudentDetail(eventId, userId);
  return NextResponse.json({ data: detail, error: null });
}
