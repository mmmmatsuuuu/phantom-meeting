import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ fileId: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
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

  const { fileId } = await params;

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) {
    return NextResponse.json({ data: null, error: "ImageKit is not configured" }, { status: 500 });
  }

  const authHeader = Buffer.from(`${privateKey}:`).toString("base64");
  const ikRes = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Basic ${authHeader}` },
  });

  if (!ikRes.ok && ikRes.status !== 404) {
    return NextResponse.json({ data: null, error: "Failed to delete image" }, { status: 502 });
  }

  return NextResponse.json({ data: { deleted: true }, error: null });
}
