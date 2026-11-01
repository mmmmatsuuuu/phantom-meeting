import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { setMakerSubmissionHidden } from "@/lib/db/maker";

type Params = { params: Promise<{ eventId: string; userId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { eventId, userId } = await params;
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const body = (await req.json()) as { hidden?: unknown };
  if (typeof body.hidden !== "boolean") {
    return NextResponse.json({ data: null, error: "hidden is required" }, { status: 400 });
  }

  const ok = await setMakerSubmissionHidden(eventId, userId, body.hidden);
  if (!ok) {
    return NextResponse.json({ data: null, error: "Failed to update" }, { status: 500 });
  }
  return NextResponse.json({ data: { userId, hidden: body.hidden }, error: null });
}
