import { NextResponse, type NextRequest } from "next/server";
import { deleteLesson } from "@/lib/db/contents";
import { createClient } from "@/lib/supabase/server";

async function requireTeacher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["teacher", "admin"].includes(profile.role)) return null;
  return user;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const user = await requireTeacher();
  if (!user) {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 });
  }

  const { lessonId } = await params;
  const ok = await deleteLesson(lessonId);
  if (!ok) {
    return NextResponse.json(
      { data: null, error: "Failed to delete lesson" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { id: lessonId }, error: null });
}
