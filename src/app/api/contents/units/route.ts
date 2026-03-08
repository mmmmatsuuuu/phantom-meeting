import { NextResponse, type NextRequest } from "next/server";
import { createUnit } from "@/lib/db/contents";
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

export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (!user) {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 });
  }

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
