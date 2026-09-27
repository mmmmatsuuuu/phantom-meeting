import { levelOf } from "@/lib/rate-level";

type Props = {
  /** 0〜1 の率。null は空の棒 */
  rate: number | null;
  className?: string;
};

/** 正答率・得点率の横棒（段階に応じた色） */
export default function RateBar({ rate, className = "" }: Props) {
  return (
    <div className={`h-2 rounded-full bg-muted overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full ${levelOf(rate).bar}`}
        style={{ width: `${Math.round((rate ?? 0) * 100)}%` }}
      />
    </div>
  );
}
