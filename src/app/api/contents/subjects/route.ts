import { NextResponse, type NextRequest } from "next/server";
import { createSubject } from "@/lib/db/contents";
import { requireTeacher } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const body = (await request.json()) as { name: string };
  if (!body.name?.trim()) {
    return NextResponse.json(
      { data: null, error: "name is required" },
      { status: 400 }
    );
  }

  const data = await createSubject(body.name.trim());
  if (!data) {
    return NextResponse.json(
      { data: null, error: "Failed to create subject" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, error: null }, { status: 201 });
}
