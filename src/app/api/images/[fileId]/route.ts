import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";

type Params = { params: Promise<{ fileId: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

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
