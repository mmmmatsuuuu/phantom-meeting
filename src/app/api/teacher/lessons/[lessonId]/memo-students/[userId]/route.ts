import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMemosByStudent } from "@/lib/db/memos";

type Params = { params: Promise<{ lessonId: string; userId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { lessonId, userId } = await params;
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

  const memos = await getMemosByStudent(lessonId, userId);
  return NextResponse.json({ data: memos, error: null });
}
