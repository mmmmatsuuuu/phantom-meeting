"use client";

import { useState } from "react";
import type { Question } from "@/lib/db/contents";
import type { Memo } from "@/lib/db/memos";
import type { Post } from "@/lib/db/posts";
import LessonTabs from "@/components/lesson/lesson-tabs";
import MemoSection from "@/components/lesson/memo-section";
import PostList from "@/components/lesson/post-list";

type Props = {
  lessonId: string;
  youtubeUrl: string;
  questions: Question[];
  posts: Post[];
  memos: Memo[];
  postedMemoIds: string[];
};

export default function LessonContent({
  lessonId,
  youtubeUrl,
  questions,
  posts,
  memos,
  postedMemoIds,
}: Props) {
  const [memoVisible, setMemoVisible] = useState(true);

  return (
    <div>
      {!memoVisible && (
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setMemoVisible(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors"
          >
            ✏️ メモを開く
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className={`${memoVisible ? "col-span-2" : "col-span-3"} space-y-8`}>
          <LessonTabs youtubeUrl={youtubeUrl} questions={questions} />
          <div className="border-t pt-6">
            <PostList posts={posts} />
          </div>
        </div>

        {memoVisible && (
          <div className="col-span-1">
            <MemoSection
              lessonId={lessonId}
              initialMemos={memos}
              initialPostedMemoIds={postedMemoIds}
              onClose={() => setMemoVisible(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
