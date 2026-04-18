import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { TiptapContent } from "@/lib/db/memos";

export type Post = Omit<Database["public"]["Tables"]["posts"]["Row"], "content"> & {
  content: TiptapContent;
  timestamp_seconds: number | null;
};

export type AuthorProfile = {
  student_number: number | null;
  display_name: string;
};

export type PostWithAuthor = Post & { authorProfile: AuthorProfile };

/**
 * 指定レッスンの投稿一覧を取得する（全認証ユーザーが閲覧可）
 */
export async function getPostsByLessonId(lessonId: string): Promise<Post[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as Post[];
}

/**
 * 指定レッスンの投稿一覧を投稿者プロフィール付きで取得する（teacher/admin 用）
 */
export async function getPostsWithAuthorsByLessonId(lessonId: string): Promise<PostWithAuthor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select("*, profiles(student_number, display_name)")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const { profiles, ...post } = row as typeof row & { profiles: AuthorProfile | null };
    return {
      ...(post as Post),
      authorProfile: profiles ?? { student_number: null, display_name: "不明" },
    };
  });
}

/**
 * 指定メモの投稿が既に存在するか確認する
 */
export async function existsPostByMemoId(memoId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("posts")
    .select("id")
    .eq("memo_id", memoId)
    .maybeSingle();

  return data !== null;
}

/**
 * メモからクラスに投稿する
 */
export async function createPost(params: {
  memoId: string;
  lessonId: string;
  content: TiptapContent;
  timestampSeconds: number | null;
}): Promise<Post | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("posts")
    .insert({
      memo_id: params.memoId,
      lesson_id: params.lessonId,
      content: params.content,
      user_id: user.id,
      timestamp_seconds: params.timestampSeconds,
    })
    .select()
    .single();

  if (error || !data) return null;
  return data as Post;
}

/**
 * 自分の投稿を削除する
 */
export async function deletePost(postId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("posts").delete().eq("id", postId);

  return !error;
}
