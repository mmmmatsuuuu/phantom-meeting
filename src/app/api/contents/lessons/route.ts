import { NextResponse, type NextRequest } from "next/server";
import { createLesson } from "@/lib/db/contents";
import { requireTeacher } from "@/lib/api/auth";

export async function POST(request: NextRequest) {
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const body = (await request.json()) as {
    unitId: string;
    title: string;
    youtubeUrl: string;
    questions: string[];
  };

  if (!body.unitId || !body.title || !body.youtubeUrl) {
    return NextResponse.json(
      { data: null, error: "unitId, title and youtubeUrl are required" },
      { status: 400 }
    );
  }

  const data = await createLesson({
    unitId: body.unitId,
    title: body.title,
    youtubeUrl: body.youtubeUrl,
    questions: body.questions ?? [],
  });

  if (!data) {
    return NextResponse.json(
      { data: null, error: "Failed to create lesson" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, error: null }, { status: 201 });
}
