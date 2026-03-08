import { NextResponse, type NextRequest } from "next/server";
import { updateUnit, deleteUnit } from "@/lib/db/contents";
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  const user = await requireTeacher();
  if (!user) {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 });
  }

  const { unitId } = await params;
  const body = (await request.json()) as { name: string };
  if (!body.name?.trim()) {
    return NextResponse.json(
      { data: null, error: "name is required" },
      { status: 400 }
    );
  }

  const ok = await updateUnit(unitId, body.name.trim());
  if (!ok) {
    return NextResponse.json(
      { data: null, error: "Failed to update unit" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { id: unitId }, error: null });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  const user = await requireTeacher();
  if (!user) {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 });
  }

  const { unitId } = await params;
  const ok = await deleteUnit(unitId);
  if (!ok) {
    return NextResponse.json(
      { data: null, error: "Failed to delete unit" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { id: unitId }, error: null });
}
