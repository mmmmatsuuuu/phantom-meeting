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
  enablePlayground: boolean;
};

// レッスンの流れ。動画で学び、ノート（またはコード）で広げ深め、小テストで確かめる
function Steps({ enablePlayground, onQuiz }: { enablePlayground: boolean; onQuiz: () => void }) {
  const steps = [
    { label: "動画で学ぶ", note: enablePlayground ? "見ながらコードを読み、予想する" : "見ながらノートの穴を埋める" },
    enablePlayground
      ? { label: "コードで試す", note: "動かして、書き換えて確かめる" }
      : { label: "ノートで広げ、深める", note: "問いに自分の考えを書く" },
  ];
  return (
    <ol className="mt-4 border-t border-rule-strong">
      {steps.map((step) => (
        <li key={step.label} className="flex justify-between gap-2 py-2.5 border-b border-rule text-sm">
          <span>{step.label}</span>
          <span className="text-xs text-muted-foreground">{step.note}</span>
        </li>
      ))}
      <li className="flex justify-between gap-2 py-2.5 border-b border-rule text-sm">
        <span>小テストで確かめる</span>
        <button onClick={onQuiz} className="text-[13px] underline underline-offset-4 hover:opacity-70">
          小テストへ
        </button>
      </li>
    </ol>
  );
}

export default function LessonTabs({ youtubeUrl, quiz, otherReviewCount, enablePlayground }: Props) {
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
        <Steps enablePlayground={enablePlayground} onQuiz={() => setActiveTab("quiz")} />
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
