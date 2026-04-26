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
  const gradeRaw = searchParams.get("grade");
  const classRaw = searchParams.get("class");
  const grade = gradeRaw !== null ? parseInt(gradeRaw, 10) : null;
  const classNum = classRaw !== null ? parseInt(classRaw, 10) : null;

  if (grade === null && classNum === null) {
    return NextResponse.json(
      { data: null, error: "grade または class のどちらかは必須です" },
      { status: 400 }
    );
  }
  if (grade !== null && isNaN(grade)) {
    return NextResponse.json({ data: null, error: "grade is invalid" }, { status: 400 });
  }
  if (classNum !== null && isNaN(classNum)) {
    return NextResponse.json({ data: null, error: "class is invalid" }, { status: 400 });
  }

  const students = await getStudentsWithMemoCounts(lessonId, grade, classNum);
  return NextResponse.json({ data: students, error: null });
}
