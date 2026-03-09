import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { approveUser } from "@/lib/db/users";

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
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

  if (profile?.role !== "admin") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  const success = await approveUser(userId);

  if (!success) {
    return NextResponse.json({ data: null, error: "Failed to approve user" }, { status: 500 });
  }

  return NextResponse.json({ data: { userId }, error: null });
}
