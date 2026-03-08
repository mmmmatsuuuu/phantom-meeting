import { NextResponse, type NextRequest } from "next/server";
import { deleteMemo } from "@/lib/db/memos";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ memoId: string }> }
) {
  const { memoId } = await params;

  const success = await deleteMemo(memoId);
  if (!success) {
    return NextResponse.json({ data: null, error: "Failed to delete memo" }, { status: 500 });
  }

  return NextResponse.json({ data: { id: memoId }, error: null });
}
