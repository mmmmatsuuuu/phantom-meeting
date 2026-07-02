import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { deletePost } from "@/lib/db/posts";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const { errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const success = await deletePost(postId);
  if (!success) {
    return NextResponse.json({ data: null, error: "Failed to delete post" }, { status: 500 });
  }

  return NextResponse.json({ data: { id: postId }, error: null });
}
