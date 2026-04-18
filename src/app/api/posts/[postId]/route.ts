import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deletePost } from "@/lib/db/posts";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });

  const success = await deletePost(postId);
  if (!success) {
    return NextResponse.json({ data: null, error: "Failed to delete post" }, { status: 500 });
  }

  return NextResponse.json({ data: { id: postId }, error: null });
}
