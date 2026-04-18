"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Post } from "@/lib/db/posts";
import RichContent from "@/components/shared/rich-content";

type Props = {
  lessonId: string;
  currentUserId: string;
  currentUserRole: string;
  seekTo: (seconds: number) => void;
};

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PostList({ lessonId, currentUserId, currentUserRole, seekTo }: Props) {
  const isTeacherOrAdmin = currentUserRole === "teacher" || currentUserRole === "admin";
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    fetch(`/api/posts?lessonId=${lessonId}`)
      .then((res) => res.json())
      .then((json: { data: Post[] | null; error: string | null }) => {
        if (json.data) setPosts(json.data);
      })
      .catch(() => {});

    const supabase = createClient();
    const channel = supabase
      .channel(`posts:${lessonId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
          filter: `lesson_id=eq.${lessonId}`,
        },
        (payload) => {
          setPosts((prev) => [payload.new as Post, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "posts",
          filter: `lesson_id=eq.${lessonId}`,
        },
        (payload) => {
          setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lessonId]);

  const handleDelete = async (postId: string) => {
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  return (
    <section>
      <h2 className="text-base font-semibold mb-4">
        💬 クラスの投稿
        {posts.length > 0 && (
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {posts.length}件
          </span>
        )}
      </h2>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center text-muted-foreground">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 mb-3 opacity-40">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
          <p className="text-sm font-medium">まだ投稿はありません</p>
          <p className="text-xs mt-1">メモをクラスに共有してみましょう</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {posts.map((post) => {
            const isMyPost = post.user_id === currentUserId;
            const canDelete = isMyPost || isTeacherOrAdmin;
            return (
              <div
                key={post.id}
                className={`p-4 rounded-lg border bg-card ${isMyPost ? "border-primary/40" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  {isMyPost && (
                    <p className="text-xs text-primary font-medium">自分の投稿</p>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-xs px-2 py-0.5 rounded border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors shrink-0 ml-auto"
                    >
                      削除
                    </button>
                  )}
                </div>
                {post.timestamp_seconds !== null && (
                  <button
                    onClick={() => seekTo(post.timestamp_seconds!)}
                    className="text-xs text-primary hover:underline mb-1 block"
                  >
                    📍 {formatTimestamp(post.timestamp_seconds)}
                  </button>
                )}
                <RichContent content={post.content as Record<string, unknown>} />
                <p className="text-xs text-muted-foreground mt-3">{formatDate(post.created_at)}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
