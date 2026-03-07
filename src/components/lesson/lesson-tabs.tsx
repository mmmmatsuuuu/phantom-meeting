"use client";

import { useState } from "react";
import VideoPlayer from "@/components/lesson/video-player";
import QuestionSection from "@/components/lesson/question-section";
import type { Question } from "@/lib/mock-data";

type Tab = "video" | "quiz";

type Props = {
  youtubeUrl: string;
  questions: Question[];
};

export default function LessonTabs({ youtubeUrl, questions }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("video");

  return (
    <div className="space-y-4">
      {/* タブ切り替え */}
      <div className="flex gap-1 p-1 bg-muted rounded-md w-fit">
        <button
          onClick={() => setActiveTab("video")}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "video"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          📺 動画
        </button>
        <button
          onClick={() => setActiveTab("quiz")}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === "quiz"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          📝 小テスト
        </button>
      </div>

      {/* 動画タブ */}
      {activeTab === "video" && (
        <div className="space-y-5">
          <VideoPlayer youtubeUrl={youtubeUrl} />
          <QuestionSection questions={questions} />
        </div>
      )}

      {/* 小テストタブ（準備中） */}
      {activeTab === "quiz" && (
        <div className="aspect-video rounded-md border bg-card flex flex-col items-center justify-center gap-2 text-center">
          <span className="text-4xl">🚧</span>
          <p className="text-sm text-muted-foreground">小テストは準備中です</p>
        </div>
      )}
    </div>
  );
}
