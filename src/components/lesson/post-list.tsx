"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Post } from "@/lib/db/posts";

type Props = {
  lessonId: string;
  currentUserId: string;
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

export default function PostList({ lessonId, currentUserId, seekTo }: Props) {
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
        <p className="text-sm text-muted-foreground">📭 まだ投稿はありません。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {posts.map((post) => {
            const isMyPost = post.user_id === currentUserId;
            return (
              <div
                key={post.id}
                className={`p-4 rounded-lg border bg-card ${isMyPost ? "border-primary/40" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  {isMyPost && (
                    <p className="text-xs text-primary font-medium">自分の投稿</p>
                  )}
                  {isMyPost && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      aria-label="投稿を削除"
                    >
                      🗑️
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
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {post.content.content
                    .flatMap((node) => node.content ?? [])
                    .filter((node) => node.type === "text")
                    .map((node) => node.text)
                    .join("")}
                </p>
                <p className="text-xs text-muted-foreground mt-3">{formatDate(post.created_at)}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
