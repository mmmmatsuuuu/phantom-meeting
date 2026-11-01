import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { getMakerExport } from "@/lib/db/maker";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const exported = await getMakerExport(eventId);
  if (!exported.event) {
    return NextResponse.json({ data: null, error: "Not found" }, { status: 404 });
  }
  return new NextResponse(JSON.stringify(exported, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="maker-${eventId}.json"`,
    },
  });
}
