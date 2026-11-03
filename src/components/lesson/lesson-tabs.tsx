"use client";

import { useState } from "react";
import VideoPlayer from "@/components/lesson/video-player";
import QuizSection from "@/components/lesson/quiz-section";
import type { QuizWithQuestions } from "@/lib/db/quizzes";

type Tab = "video" | "quiz";

type Props = {
  youtubeUrl: string;
  quiz: QuizWithQuestions | null;
  otherReviewCount?: number;
};

export default function LessonTabs({ youtubeUrl, quiz, otherReviewCount }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("video");

  const tabClass = (tab: Tab) =>
    `pb-1 -mb-px border-b-[3px] text-sm transition-colors ${
      activeTab === tab
        ? "border-ink text-ink font-semibold"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div>
      <div className="flex gap-[22px] border-b border-rule-strong mb-4">
        <button onClick={() => setActiveTab("video")} className={tabClass("video")}>
          動画
        </button>
        <button onClick={() => setActiveTab("quiz")} className={tabClass("quiz")}>
          小テスト
        </button>
      </div>

      {/* 動画はタブを切り替えても止めないよう、外さずに隠す */}
      <div className={activeTab === "video" ? "" : "hidden"}>
        <VideoPlayer youtubeUrl={youtubeUrl} />
      </div>

      {activeTab === "quiz" &&
        (quiz ? (
          <QuizSection quiz={quiz} otherReviewCount={otherReviewCount} />
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">
            このレッスンにはまだ小テストがありません
          </p>
        ))}
    </div>
  );
}
