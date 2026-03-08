import type { Post } from "@/lib/db/posts";
import type { TiptapContent } from "@/lib/db/memos";

type Props = {
  posts: Post[];
};

function extractText(content: TiptapContent): string {
  return content.content
    .flatMap((node) => node.content ?? [])
    .filter((node) => node.type === "text")
    .map((node) => node.text)
    .join("");
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PostList({ posts }: Props) {
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
          {posts.map((post) => (
            <div key={post.id} className="p-4 rounded-lg border bg-card">
              <p className="text-sm leading-relaxed">{extractText(post.content)}</p>
              <p className="text-xs text-muted-foreground mt-3">
                {formatDate(post.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
