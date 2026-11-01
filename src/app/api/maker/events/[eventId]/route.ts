import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { deleteMakerEvent, updateMakerEvent, type MakerStatus } from "@/lib/db/maker";
import { parseMakerSettings } from "@/lib/maker-settings";

type Params = { params: Promise<{ eventId: string }> };

const STATUSES: MakerStatus[] = ["draft", "open", "closed"];

export async function PUT(req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const body = (await req.json()) as {
    title?: unknown;
    description?: unknown;
    unitId?: unknown;
    status?: unknown;
    settings?: unknown;
  };
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const status = STATUSES.find((s) => s === body.status);
  if (!title || title.length > 100 || !status) {
    return NextResponse.json({ data: null, error: "Invalid request" }, { status: 400 });
  }

  const ok = await updateMakerEvent(eventId, {
    title,
    description: typeof body.description === "string" ? body.description : "",
    unitId: typeof body.unitId === "string" && body.unitId ? body.unitId : null,
    status,
    settings: parseMakerSettings(body.settings),
  });
  if (!ok) {
    return NextResponse.json({ data: null, error: "Failed to save event" }, { status: 500 });
  }
  return NextResponse.json({ data: { eventId }, error: null });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { eventId } = await params;
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const ok = await deleteMakerEvent(eventId);
  if (!ok) {
    return NextResponse.json({ data: null, error: "Failed to delete event" }, { status: 500 });
  }
  return NextResponse.json({ data: { eventId }, error: null });
}
