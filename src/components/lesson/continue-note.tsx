import Link from "next/link";

type Props = {
  lessonId: string;
  title: string;
};

/**
 * 目次の先頭の「続きから」。最後にノートを書いたレッスンへ戻る付箋。
 * 付箋の黄色はここにだけ使う（docs/design.md の「配色」）
 */
export default function ContinueNote({ lessonId, title }: Props) {
  return (
    <Link
      href={`/lessons/${lessonId}`}
      className="group relative block w-full max-w-[380px] mt-8 mb-2 px-[22px] pt-[22px] pb-[18px] bg-note -rotate-[1.2deg] [clip-path:polygon(0_0,100%_0,100%_calc(100%-18px),calc(100%-18px)_100%,0_100%)] before:absolute before:inset-x-0 before:top-0 before:h-[14px] before:bg-ink/5 after:absolute after:right-0 after:bottom-0 after:size-[18px] after:bg-[linear-gradient(135deg,rgb(29_43_63/0.16)_50%,transparent_50%)]"
    >
      <span className="block text-xs text-[#5c5a50]">続きから</span>
      <span className="block font-hand font-semibold text-2xl leading-normal group-hover:underline underline-offset-[5px]">
        {title}
      </span>
      <span className="block mt-1 text-[13px] text-[#5c5a50]">
        ノートの途中です　<span className="text-ink underline underline-offset-4">続ける</span>
      </span>
    </Link>
  );
}
