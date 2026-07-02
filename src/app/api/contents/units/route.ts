import { NextResponse, type NextRequest } from "next/server";
import { createUnit } from "@/lib/db/contents";
import { requireTeacher } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const body = (await request.json()) as { subjectId: string; name: string };
  if (!body.subjectId || !body.name?.trim()) {
    return NextResponse.json(
      { data: null, error: "subjectId and name are required" },
      { status: 400 }
    );
  }

  const data = await createUnit(body.subjectId, body.name.trim());
  if (!data) {
    return NextResponse.json(
      { data: null, error: "Failed to create unit" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, error: null }, { status: 201 });
}
