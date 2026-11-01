import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { setMakerOpening } from "@/lib/db/maker";

type Params = { params: Promise<{ eventId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const body = (await req.json()) as { grade?: unknown; classNum?: unknown; open?: unknown };
  if (
    typeof body.grade !== "number" ||
    typeof body.classNum !== "number" ||
    typeof body.open !== "boolean"
  ) {
    return NextResponse.json({ data: null, error: "Invalid request" }, { status: 400 });
  }

  const ok = await setMakerOpening(eventId, body.grade, body.classNum, body.open);
  if (!ok) {
    return NextResponse.json({ data: null, error: "Failed to update" }, { status: 500 });
  }
  return NextResponse.json({ data: { eventId }, error: null });
}
