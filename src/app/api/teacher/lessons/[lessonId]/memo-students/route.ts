import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStudentsWithMemoCounts } from "@/lib/db/memos";

type Params = { params: Promise<{ lessonId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher" && profile?.role !== "admin") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const grade = parseInt(searchParams.get("grade") ?? "", 10);
  const classNum = parseInt(searchParams.get("class") ?? "", 10);

  if (isNaN(grade) || isNaN(classNum)) {
    return NextResponse.json({ data: null, error: "grade and class are required" }, { status: 400 });
  }

  const students = await getStudentsWithMemoCounts(lessonId, grade, classNum);
  return NextResponse.json({ data: students, error: null });
}
