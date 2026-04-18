"use client";

import { useState, useRef } from "react";
import type { YouTubePlayer } from "react-youtube";
import type { Question } from "@/lib/db/contents";
import type { QuizWithQuestions } from "@/lib/db/quizzes";
import LessonTabs from "@/components/lesson/lesson-tabs";
import MemoSection from "@/components/lesson/memo-section";
import PostList from "@/components/lesson/post-list";

type Props = {
  lessonId: string;
  youtubeUrl: string;
  questions: Question[];
  quiz: QuizWithQuestions | null;
  currentUserId: string;
  currentUserRole: string;
  initialIsCompleted: boolean;
};

export default function LessonContent({
  lessonId,
  youtubeUrl,
  questions,
  quiz,
  currentUserId,
  currentUserRole,
  initialIsCompleted,
}: Props) {
  const [memoVisible, setMemoVisible] = useState(true);
  // 小テストなし or 完了済みなら最初からアンロック
  const [isPostUnlocked, setIsPostUnlocked] = useState(
    quiz === null || initialIsCompleted
  );
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

      <div className="grid grid-cols-5 gap-6">
        <div className={`${memoVisible ? "col-span-3" : "col-span-5"} space-y-8`}>
          <LessonTabs
            youtubeUrl={youtubeUrl}
            questions={questions}
            quiz={quiz}
            onPlayerReady={(player) => {
              playerRef.current = player;
            }}
            onQuizCompleted={() => setIsPostUnlocked(true)}
          />
          <div className="border-t pt-6">
            {isPostUnlocked ? (
              <PostList lessonId={lessonId} currentUserId={currentUserId} currentUserRole={currentUserRole} seekTo={seekTo} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <span className="text-4xl">🔒</span>
                <p className="text-sm text-muted-foreground">
                  小テストを完了すると、みんなの投稿が見られます
                </p>
              </div>
            )}
          </div>
        </div>

        {memoVisible && (
          <div className="col-span-2">
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
