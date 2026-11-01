import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";
import { createMakerEvent } from "@/lib/db/maker";

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const body = (await req.json()) as { title?: unknown };
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 100) {
    return NextResponse.json({ data: null, error: "title is invalid" }, { status: 400 });
  }

  const id = await createMakerEvent(title, user.id);
  if (!id) {
    return NextResponse.json({ data: null, error: "Failed to create event" }, { status: 500 });
  }
  return NextResponse.json({ data: { id }, error: null });
}
