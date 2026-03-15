import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type UpdateProfileBody = {
  targetUserId?: string; // teacher/admin が他ユーザーを更新する場合に指定
  displayName?: string;
  studentNumber?: number | null;
  note?: string | null;
};

export async function PUT(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const body = (await req.json()) as UpdateProfileBody;
  const targetUserId = body.targetUserId ?? user.id;

  // 他ユーザーを更新しようとしている場合は teacher/admin のみ許可
  if (targetUserId !== user.id) {
    if (myProfile?.role !== "teacher" && myProfile?.role !== "admin") {
      return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 });
    }
  }

  const patch: Record<string, unknown> = {};
  if (body.displayName !== undefined) patch.display_name = body.displayName;
  if (body.studentNumber !== undefined) patch.student_number = body.studentNumber;
  if (body.note !== undefined) patch.note = body.note;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ data: null, error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", targetUserId)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ data: null, error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ data, error: null });
}
