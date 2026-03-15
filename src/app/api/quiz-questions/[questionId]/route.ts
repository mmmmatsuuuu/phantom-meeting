import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteQuizQuestion } from "@/lib/db/quizzes";

type Params = { params: Promise<{ questionId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { questionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["teacher", "admin"].includes(profile.role)) {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 });
  }

  const ok = await deleteQuizQuestion(questionId);
  if (!ok) {
    return NextResponse.json({ data: null, error: "Failed to delete question" }, { status: 500 });
  }

  return NextResponse.json({ data: { id: questionId }, error: null });
}
