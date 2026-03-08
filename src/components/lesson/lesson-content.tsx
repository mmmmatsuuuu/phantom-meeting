"use client";

import { useState, useRef } from "react";
import type { YouTubePlayer } from "react-youtube";
import type { Question } from "@/lib/db/contents";
import LessonTabs from "@/components/lesson/lesson-tabs";
import MemoSection from "@/components/lesson/memo-section";
import PostList from "@/components/lesson/post-list";

type Props = {
  lessonId: string;
  youtubeUrl: string;
  questions: Question[];
  currentUserId: string;
};

export default function LessonContent({
  lessonId,
  youtubeUrl,
  questions,
  currentUserId,
}: Props) {
  const [memoVisible, setMemoVisible] = useState(true);
  const playerRef = useRef<YouTubePlayer | null>(null);

  const getCurrentTime = (): number | null => {
    if (!playerRef.current) return null;
    return Math.floor(playerRef.current.getCurrentTime());
  };

  const seekTo = (seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
  };

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
          <LessonTabs
            youtubeUrl={youtubeUrl}
            questions={questions}
            onPlayerReady={(player) => {
              playerRef.current = player;
            }}
          />
          <div className="border-t pt-6">
            <PostList lessonId={lessonId} currentUserId={currentUserId} />
          </div>
        </div>

        {memoVisible && (
          <div className="col-span-1">
            <MemoSection
              lessonId={lessonId}
              getCurrentTime={getCurrentTime}
              seekTo={seekTo}
              onClose={() => setMemoVisible(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
